#!/usr/bin/env bash
# Makes .env usable for local dev: creates it from .env.example, adds every key that .env lacks,
# and replaces empty or CHANGE_ME values with the example's dev default. Values you set yourself stay.
# The dev database is only reachable on 127.0.0.1 and `make dev` recreates it on every run,
# so the mock password from .env.example is fine here.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "▶ Created .env from .env.example."
  exit 0
fi

while IFS= read -r line; do
  case "$line" in ''|'#'*) continue ;; esac
  key="${line%%=*}"
  default="${line#*=}"
  current="$(grep -E "^${key}=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r' || true)"
  if ! grep -qE "^${key}=" .env; then
    echo "${key}=${default}" >> .env
    echo "▶ .env: added ${key} from .env.example."
  elif [ -z "$current" ] || [ "$current" = "CHANGE_ME" ]; then
    sed -i "s|^${key}=.*|${key}=${default}|" .env
    echo "▶ .env: set ${key} to the dev default from .env.example."
  fi
done < .env.example
