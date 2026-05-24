# MemoryFlow Operations

## Server Layout

Recommended vibeflow-server paths:

```text
/opt/memoryflow                  app checkout
/mnt/data/storage/memoryflow     uploaded media and generated outputs
/mnt/data/postgres/memoryflow    PostgreSQL data volume
/mnt/data/backup/memoryflow      secondary backups on the data disk
```

The app container binds to `127.0.0.1:3000` by default. Nginx should be the public entrypoint.

## First Deploy

```bash
sudo mkdir -p /opt /mnt/data/storage/memoryflow /mnt/data/postgres/memoryflow /mnt/data/backup/memoryflow
cd /opt
git clone https://github.com/remge21c/MemoryFlow.git memoryflow
cd /opt/memoryflow
cp .env.production.example .env.production
nano .env.production
sh scripts/production-check.sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The web container runs `prisma migrate deploy` before starting Next.js.

## Required Production Variables

```text
POSTGRES_PASSWORD    long random value, never the example value
SESSION_SECRET       at least 32 characters
APP_BASE_URL         https://vibeflow.com
APP_BIND             127.0.0.1 when Nginx is used
APP_PORT             3000
STORAGE_DIR          /mnt/data/storage/memoryflow
POSTGRES_DATA_DIR    /mnt/data/postgres/memoryflow
BACKUP_ROOT          /mnt/data/backup/memoryflow
OPENAI_API_KEY       optional during development, required for real AI review
OPENAI_MODEL         gpt-4o-mini
```

Generate strong secrets on Ubuntu:

```bash
openssl rand -base64 36
```

## Preflight Check

Run before the first deploy and after changing `.env.production`:

```bash
cd /opt/memoryflow
sh scripts/production-check.sh
```

It verifies required variables, refuses example secrets, creates the storage/postgres/backup directories, checks write permissions, and validates the Compose config.

## Update Deploy

```bash
cd /opt/memoryflow
ENV_FILE=.env.production APP_DIR=/opt/memoryflow BRANCH=main sh scripts/deploy.sh
```

This pulls `origin/main`, rebuilds the web image, restarts PostgreSQL/web, and prunes old images.

## Health Check

```bash
curl -fsS http://127.0.0.1:3000/api/health
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker logs --tail=100 memoryflow-web
```

## Backup Policy

Project period:

```bash
cd /opt/memoryflow
BACKUP_TYPE=daily RETENTION_DAYS=60 sh scripts/backup.sh
```

Outside project period:

```bash
cd /opt/memoryflow
BACKUP_TYPE=weekly RETENTION_DAYS=365 sh scripts/backup.sh
```

The backup script writes:

```text
/mnt/data/backup/memoryflow/{daily|weekly|snapshot}/{timestamp}/db.sql
/mnt/data/backup/memoryflow/{daily|weekly|snapshot}/{timestamp}/storage/
/mnt/data/backup/memoryflow/{daily|weekly|snapshot}/{timestamp}/manifest.txt
```

## Cron Examples

Daily during active trip periods:

```cron
0 3 * * * cd /opt/memoryflow && BACKUP_TYPE=daily RETENTION_DAYS=60 sh scripts/backup.sh >> /var/log/memoryflow-backup.log 2>&1
```

Weekly outside trip periods:

```cron
0 3 * * 0 cd /opt/memoryflow && BACKUP_TYPE=weekly RETENTION_DAYS=365 sh scripts/backup.sh >> /var/log/memoryflow-backup.log 2>&1
```

## Restore

Restore is destructive. Stop the web container first.

```bash
cd /opt/memoryflow
docker compose --env-file .env.production -f docker-compose.prod.yml stop web
CONFIRM=RESTORE BACKUP_DIR=/mnt/data/backup/memoryflow/daily/yyyymmdd-hhmmss sh scripts/restore.sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d web
```

## Nginx / Cloudflare

```nginx
server {
  server_name vibeflow.com;

  client_max_body_size 600M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Cloudflare should proxy `vibeflow.com` to the server. Use Full Strict SSL after a valid origin certificate is installed.

## Operating Notes

- Keep `.env.production` only on the server. Do not commit it.
- `OPENAI_API_KEY` may be empty while doing local UX tests; real AI review needs the key.
- The production app stores database data and uploaded files under `/mnt/data`, matching the server data disk plan.
- For video rendering, keep Remotion/VideoFlow on the A18 machine and upload the final video file into MemoryFlow.
