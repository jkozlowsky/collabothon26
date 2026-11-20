#!/usr/bin/env bash
# One command for local dev: Postgres + backend (in the background, logs in logs/backend.log) + Expo.
# Default: browser dev on loopback only (--web --localhost).
# Pass --phone (or run `make phone`) for a physical phone via an Expo ngrok tunnel QR.
# Ctrl+C stops backend and frontend (Postgres keeps running; `make db-stop` stops it).
set -euo pipefail
cd "$(dirname "$0")/.."

PHONE="${PHONE:-}"
if [ "${1:-}" = "--phone" ]; then
  PHONE=1
  shift
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "▶ Created .env from .env.example."
fi

get_env_val() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r'
}

PG_PW="$(get_env_val POSTGRES_PASSWORD || true)"
DB_PW="$(get_env_val DB_PASSWORD || true)"

if [ -z "$PG_PW" ] || [ -z "$DB_PW" ] || [ "$PG_PW" = "CHANGE_ME" ] || [ "$DB_PW" = "CHANGE_ME" ]; then
  echo "✖ .env still has the placeholder DB password (CHANGE_ME)."
  echo "  Edit .env and set matching POSTGRES_PASSWORD and DB_PASSWORD, then re-run:"
  echo "  - New worktree / existing Postgres volume: copy your existing .env from your main checkout so the password matches."
  echo "  - Want a new password on an existing volume? Set it in .env, then run 'make db-reset' to recreate the volume."
  exit 1
fi

if [ "$PG_PW" != "$DB_PW" ]; then
  echo "✖ POSTGRES_PASSWORD and DB_PASSWORD in .env do not match. Set both to the same password and re-run."
  exit 1
fi

[ -d front/node_modules ] || (cd front && npm install)

docker compose up -d --wait

if curl -sf 127.0.0.1:8080/actuator/health >/dev/null; then
  echo "▶ Backend already running on 127.0.0.1:8080, using it."
else
  mkdir -p logs
  echo "▶ Starting backend (logs: tail -f logs/backend.log)..."
  (cd back && exec ./mvnw spring-boot:run) >logs/backend.log 2>&1 &
  BACK_PID=$!
  trap 'kill $BACK_PID 2>/dev/null; wait $BACK_PID 2>/dev/null' EXIT

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

if [ -n "$PHONE" ]; then
  # Work around Expo SDK 58 bug: --tunnel ngrok invokes adb reverse whenever ANDROID_HOME
  # (or ~/Android/Sdk) exists, even if platform-tools/adb is not installed.
  if ! command -v adb >/dev/null 2>&1 && [ ! -x "${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb" ]; then
    export ANDROID_HOME=/nonexistent
  fi
  echo "▶ Starting app for phone via Expo ngrok tunnel (scan the QR with Expo Go)"
  cd front && npx expo start --tunnel ngrok "$@"
else
  echo "▶ Starting app (browser, loopback only): http://localhost:8081"
  cd front && npx expo start --web --localhost "$@"
fi
