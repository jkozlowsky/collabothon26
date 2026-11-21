#!/usr/bin/env bash
# One command for local dev: Postgres + backend (in the background, logs in logs/backend.log) + Expo.
# Default (`make dev`): Metro on loopback + an Expo ngrok tunnel QR for a physical phone;
# the browser still works at http://localhost:8081 (press w).
# Pass --web (or run `make web`) for browser-only dev without the tunnel.
# Pass --usb (or run `make phone-usb`) for an Android phone on a USB cable: `adb reverse`
# + Metro on --localhost, so nothing leaves the laptop's loopback (no tunnel, no LAN).
# Ctrl+C stops backend and frontend (Postgres keeps running; `make db-stop` stops it).
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=phone
case "${1:-}" in
  --web) MODE=web; shift ;;
  --phone) MODE=phone; shift ;;
  --usb) MODE=usb; shift ;;
esac

# Fail early for USB mode: without adb there is no way to reach the phone over the cable.
if [ "$MODE" = usb ] && ! command -v adb >/dev/null 2>&1; then
  echo "✖ adb not found. Install Android platform-tools:"
  echo "    Fedora:        sudo dnf install android-tools"
  echo "    Ubuntu/Debian: sudo apt install adb"
  echo "    macOS:         brew install android-platform-tools"
  echo "  Then enable Developer options > USB debugging on the phone, plug it in and accept the prompt."
  exit 1
fi

./scripts/sync-env.sh

get_env_val() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r'
}

PG_PW="$(get_env_val POSTGRES_PASSWORD || true)"
DB_PW="$(get_env_val DB_PASSWORD || true)"

if [ "$PG_PW" != "$DB_PW" ]; then
  echo "✖ POSTGRES_PASSWORD and DB_PASSWORD in .env do not match. Set both to the same password and re-run."
  exit 1
fi

[ -d front/node_modules ] || (cd front && npm install)

# Fedora and others resolve `localhost` to ::1 only, while Metro listens on 127.0.0.1. Without
# this, Expo CLI waits forever on "Waiting on http://localhost:8081" and the phone never loads.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--dns-result-order=ipv4first"

# Background jobs (backend, bundle pre-warm) to stop on exit.
CHILD_PIDS=()
cleanup() {
  for pid in "${CHILD_PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
  for pid in "${CHILD_PIDS[@]}"; do wait "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT

docker compose up -d --wait

if curl -sf 127.0.0.1:8080/actuator/health >/dev/null; then
  # `make dev` resets the database first; a backend started before that never migrated the new one and
  # answers 500 ("relation ... does not exist"). Only reuse a backend that can actually read its tables.
  status="$(curl -s -o /dev/null -w '%{http_code}' '127.0.0.1:8080/api/stories?userId=dev-check' || true)"
  if [ "$status" != "200" ]; then
    echo "✖ A backend is already running on 127.0.0.1:8080, but it cannot use the database (HTTP $status)."
    echo "  It was started before the database was reset, so it has no tables. Stop it and run this again:"
    echo "    pkill -f BackApplication   (or stop it in your IDE)"
    exit 1
  fi
  echo "▶ Backend already running on 127.0.0.1:8080, using it."
else
  mkdir -p logs
  echo "▶ Starting backend (logs: tail -f logs/backend.log)..."
  (cd back && exec ./mvnw spring-boot:run) >logs/backend.log 2>&1 &
  BACK_PID=$!
  CHILD_PIDS+=("$BACK_PID")

  for _ in $(seq 1 120); do
    curl -sf 127.0.0.1:8080/actuator/health >/dev/null && break
    if ! kill -0 $BACK_PID 2>/dev/null; then
      echo "✖ Backend crashed, last log lines:"
      tail -30 logs/backend.log
      if grep -qi "password authentication failed" logs/backend.log; then
        echo ""
        echo "Hint: Postgres password mismatch — the existing collabothon26_postgres-data volume keeps its original password."
        echo "      Copy your existing .env (or match its password), or run 'make db-reset' to recreate the volume."
      fi
      exit 1
    fi
    sleep 1
  done
  curl -sf 127.0.0.1:8080/actuator/health >/dev/null || { echo "✖ Backend not up after 120 s, see logs/backend.log"; exit 1; }
  echo "✔ Backend ready: http://127.0.0.1:8080"
fi

port_in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

# First free loopback port from 8081, so `make phone` can run next to `make dev`
# (which holds 8081) without Expo's interactive "Use port 8082?" prompt.
pick_metro_port() {
  local port=8081
  while port_in_use "$port"; do port=$((port + 1)); done
  echo "$port"
}

# Build the Android bundle once over loopback right after Metro starts, so the phone's first
# request is served from cache. A cold build is the slowest step; doing it while Expo Go waits
# on the tunnel is what made "Failed to download remote update" likely.
prewarm_android_bundle() {
  local port=$1 manifest url
  for _ in $(seq 1 180); do
    manifest="$(curl -sf -H 'expo-platform: android' -H 'accept: application/expo+json,application/json' \
      "http://127.0.0.1:$port/" 2>/dev/null || true)"
    url="$(grep -oE '"url":"[^"]*entry\.bundle[^"]*"' <<<"$manifest" | head -n 1 | cut -d'"' -f4)"
    [ -n "$url" ] && break
    sleep 1
  done
  [ -n "$url" ] || return 0
  # Same bundle the phone will ask for, fetched from Metro's loopback address instead of the tunnel.
  url="http://127.0.0.1:$port/${url#*://*/}"
  if curl -sf -o /dev/null --max-time 600 "$url"; then
    printf '\n✔ Android bundle built and cached. Open the app on the phone now.\n\n'
  else
    printf '\n✖ Pre-building the Android bundle failed; the phone will build it on first load.\n\n'
  fi
}

case "$MODE" in
  phone)
    # Work around Expo SDK 58 bug: --tunnel ngrok invokes adb reverse whenever ANDROID_HOME
    # (or ~/Android/Sdk) exists, even if platform-tools/adb is not installed.
    if ! command -v adb >/dev/null 2>&1 && [ ! -x "${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb" ]; then
      export ANDROID_HOME=/nonexistent
    fi
    # The tunnel host is built from urlRandomness in front/.expo/settings.json. Expo can generate
    # it with an underscore (e.g. "huoqT_M" -> huoqt_m-<user>-8081.exp.direct); `_` is not valid
    # in a hostname, so Expo Go on the phone cannot load the app. Strip it before Expo starts.
    EXPO_SETTINGS=front/.expo/settings.json
    if [ -f "$EXPO_SETTINGS" ] && grep -qE '"urlRandomness": *"[^"]*_' "$EXPO_SETTINGS"; then
      sed -i -E ':a; s/("urlRandomness": *"[^"_]*)_/\1/; ta' "$EXPO_SETTINGS"
      echo "▶ Removed '_' from the Expo tunnel name (invalid in a hostname, breaks Expo Go)."
    fi
    METRO_PORT="$(pick_metro_port)"
    prewarm_android_bundle "$METRO_PORT" &
    CHILD_PIDS+=("$!")
    echo "▶ Starting app for phone via Expo ngrok tunnel on 127.0.0.1:$METRO_PORT (scan the QR with Expo Go)"
    echo "  Wait for '✔ Android bundle built' before scanning."
    cd front && npx expo start --tunnel ngrok --port "$METRO_PORT" "$@"
    ;;
  usb)
    METRO_PORT="$(pick_metro_port)"
    devices="$(adb devices | awk 'NR > 1 && $2 == "device"' | wc -l)"
    if [ "$devices" -eq 0 ]; then
      echo "✖ No Android device authorised over USB (adb devices):"
      adb devices
      echo "  Plug the phone in, enable USB debugging and accept the 'Allow USB debugging?' prompt."
      exit 1
    fi
    # The phone's 127.0.0.1:PORT now goes through the cable to the laptop's 127.0.0.1:PORT.
    # Metro stays on loopback; nothing is reachable from the network.
    adb reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT"
    prewarm_android_bundle "$METRO_PORT" &
    CHILD_PIDS+=("$!")
    echo "▶ Starting app for an Android phone over USB (adb reverse, loopback only)"
    echo "  In Expo Go: 'Enter URL manually' -> exp://127.0.0.1:$METRO_PORT (or scan the QR)."
    cd front && npx expo start --localhost --port "$METRO_PORT" "$@"
    ;;
  *)
    echo "▶ Starting app (browser, loopback only): http://localhost:8081"
    cd front && npx expo start --web --localhost "$@"
    ;;
esac
