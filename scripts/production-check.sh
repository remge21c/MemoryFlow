#!/bin/sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ ! -f "$ENV_FILE" ]; then
  echo "FAIL: $ENV_FILE not found."
  echo "Copy .env.production.example to $ENV_FILE and fill production values."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

required_vars="POSTGRES_PASSWORD SESSION_SECRET APP_BASE_URL STORAGE_DIR POSTGRES_DATA_DIR BACKUP_ROOT"

for name in $required_vars; do
  value="$(eval "printf '%s' \"\${$name:-}\"")"
  if [ -z "$value" ]; then
    echo "FAIL: $name is empty in $ENV_FILE."
    exit 1
  fi
done

if [ "${POSTGRES_PASSWORD}" = "change-this-long-random-password" ]; then
  echo "FAIL: POSTGRES_PASSWORD still uses the example value."
  exit 1
fi

if [ "${SESSION_SECRET}" = "change-this-at-least-32-characters" ]; then
  echo "FAIL: SESSION_SECRET still uses the example value."
  exit 1
fi

if [ "$(printf '%s' "$SESSION_SECRET" | wc -c | tr -d ' ')" -lt 32 ]; then
  echo "FAIL: SESSION_SECRET must be at least 32 characters."
  exit 1
fi

for dir in "$STORAGE_DIR" "$POSTGRES_DATA_DIR" "$BACKUP_ROOT"; do
  mkdir -p "$dir"
  if [ ! -w "$dir" ]; then
    echo "FAIL: $dir is not writable."
    exit 1
  fi
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

echo "OK: production env, directories, and docker compose config are ready."
