#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/memoryflow}"
BRANCH="${BRANCH:-main}"
ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.prod.yml"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.production.example and fill real values first." >&2
  exit 1
fi

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

$COMPOSE build web
$COMPOSE up -d postgres web
docker image prune -f

echo "MemoryFlow deployed from origin/$BRANCH"
