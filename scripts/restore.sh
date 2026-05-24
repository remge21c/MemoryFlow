#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-memoryflow-postgres}"
POSTGRES_USER="${POSTGRES_USER:-memoryflow}"
POSTGRES_DB="${POSTGRES_DB:-memoryflow}"
STORAGE_DEST="${STORAGE_DEST:-/mnt/data/storage/memoryflow}"
CONFIRM="${CONFIRM:-}"

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: CONFIRM=RESTORE BACKUP_DIR=/mnt/data/backup/memoryflow/daily/yyyymmdd-hhmmss sh scripts/restore.sh" >&2
  exit 1
fi

if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Refusing to restore without CONFIRM=RESTORE." >&2
  echo "Restore replaces database contents and file storage." >&2
  exit 1
fi

if [ ! -f "$BACKUP_DIR/db.sql" ]; then
  echo "Missing $BACKUP_DIR/db.sql" >&2
  exit 1
fi

echo "Restoring database from $BACKUP_DIR/db.sql..."
docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB" <<SQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
SQL
docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$BACKUP_DIR/db.sql"

if [ -d "$BACKUP_DIR/storage" ]; then
  echo "Restoring file storage to $STORAGE_DEST..."
  rm -rf "$STORAGE_DEST"
  mkdir -p "$STORAGE_DEST"
  cp -a "$BACKUP_DIR/storage/." "$STORAGE_DEST/"
fi

echo "Restore complete from $BACKUP_DIR"
