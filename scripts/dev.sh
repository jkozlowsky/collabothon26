#!/usr/bin/env bash
# One command for local dev: Postgres + backend (in the background, logs in logs/backend.log) + Expo.
# Ctrl+C stops backend and frontend (Postgres keeps running; `make db-stop` stops it).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env
[ -d front/node_modules ] || (cd front && npm install)

docker compose up -d --wait

if curl -sf localhost:8080/actuator/health >/dev/null; then
  echo "▶ Backend already running on :8080, using it."
else
  mkdir -p logs
  echo "▶ Starting backend (logs: tail -f logs/backend.log)..."
  (cd back && exec ./mvnw spring-boot:run) >logs/backend.log 2>&1 &
  BACK_PID=$!
  trap 'kill $BACK_PID 2>/dev/null; wait $BACK_PID 2>/dev/null' EXIT

  for _ in $(seq 1 120); do
    curl -sf localhost:8080/actuator/health >/dev/null && break
    kill -0 $BACK_PID 2>/dev/null || { echo "✖ Backend crashed, last log lines:"; tail -30 logs/backend.log; exit 1; }
    sleep 1
  done
  curl -sf localhost:8080/actuator/health >/dev/null || { echo "✖ Backend not up after 120 s, see logs/backend.log"; exit 1; }
  echo "✔ Backend ready: http://localhost:8080"
fi

EXPO_ARGS=(--web)
# WSL2 (NAT): a phone can't reach the WSL IP, so the Expo Go QR goes through a tunnel. Disable: NO_TUNNEL=1 make dev
if grep -qi microsoft /proc/version 2>/dev/null && [ -z "${NO_TUNNEL:-}" ]; then
  EXPO_ARGS+=(--tunnel ngrok)
  echo "▶ WSL detected: phone QR goes through a tunnel (NO_TUNNEL=1 disables)"
fi

echo "▶ Starting app: http://localhost:8081"
cd front && npx expo start "${EXPO_ARGS[@]}" "$@"
