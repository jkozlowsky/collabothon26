#!/usr/bin/env bash
# Fails if the current branch modifies, deletes or renames a Flyway migration that exists on <base-ref>.
# Usage: scripts/check-migrations.sh origin/main
set -euo pipefail
cd "$(dirname "$0")/.."

dir=back/src/main/resources/db/migration
# --no-renames reports a rename as delete + add; filter "a" drops the added files.
changed=$(git diff --no-renames --diff-filter=a --name-only "${1:?base ref required}...HEAD" -- "$dir")

if [ -n "$changed" ]; then
  echo "Applied migrations must not be edited, deleted or renamed. Add a new V<n>__ file instead:"
  echo "$changed"
  exit 1
fi
