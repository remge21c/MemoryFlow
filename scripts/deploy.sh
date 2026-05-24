#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/memoryflow}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d postgres web
docker image prune -f

echo "MemoryFlow deployed from origin/$BRANCH"
