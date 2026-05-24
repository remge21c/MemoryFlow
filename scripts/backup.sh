#!/bin/sh
set -eu

BACKUP_TYPE="${BACKUP_TYPE:-daily}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ROOT="${BACKUP_ROOT:-/mnt/data/backup/memoryflow}"
STORAGE_SRC="${STORAGE_SRC:-/mnt/data/storage/memoryflow}"
DEST="$ROOT/$BACKUP_TYPE/$STAMP"
RETENTION_DAYS="${RETENTION_DAYS:-0}"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-memoryflow-postgres}"
POSTGRES_USER="${POSTGRES_USER:-memoryflow}"
POSTGRES_DB="${POSTGRES_DB:-memoryflow}"

mkdir -p "$DEST"

echo "Creating database backup..."
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$DEST/db.sql"

echo "Copying file storage..."
mkdir -p "$DEST/storage"
cp -a "$STORAGE_SRC/." "$DEST/storage/" 2>/dev/null || true

cat > "$DEST/manifest.txt" <<EOF
type=$BACKUP_TYPE
created_at=$STAMP
database=$POSTGRES_DB
storage_source=$STORAGE_SRC
EOF

if [ "$RETENTION_DAYS" -gt 0 ]; then
  echo "Pruning $BACKUP_TYPE backups older than $RETENTION_DAYS days..."
  find "$ROOT/$BACKUP_TYPE" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
fi

echo "Backup complete: $DEST"
