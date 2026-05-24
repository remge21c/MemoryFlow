# MemoryFlow Operations

## Server Layout

Recommended vibeflow-server paths:

```text
/opt/memoryflow                  app checkout
/mnt/data/storage/memoryflow     local uploaded files and generated outputs
/mnt/data/postgres/memoryflow    PostgreSQL data volume
/mnt/data/backup/memoryflow      secondary backups on D/data disk
```

## First Deploy

```bash
cd /opt
git clone https://github.com/remge21c/MemoryFlow.git memoryflow
cd /opt/memoryflow
cp .env.production.example .env
nano .env
docker compose -f docker-compose.prod.yml up -d --build
```

The web container runs `prisma migrate deploy` before starting Next.js.

## Update Deploy

```bash
APP_DIR=/opt/memoryflow BRANCH=main sh scripts/deploy.sh
```

This pulls `origin/main`, rebuilds the web image, restarts the app, and prunes old images.

## Backup Policy

Project-period backup:

```bash
BACKUP_TYPE=daily sh scripts/backup.sh
```

Outside project period:

```bash
BACKUP_TYPE=weekly sh scripts/backup.sh
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
0 3 * * * cd /opt/memoryflow && BACKUP_TYPE=daily sh scripts/backup.sh >> /var/log/memoryflow-backup.log 2>&1
```

Weekly outside trip periods:

```cron
0 3 * * 0 cd /opt/memoryflow && BACKUP_TYPE=weekly sh scripts/backup.sh >> /var/log/memoryflow-backup.log 2>&1
```

## Nginx / Cloudflare

Run the app on local port `3000` and put Nginx in front of it.

```nginx
server {
  server_name vibeflow.com;

  client_max_body_size 600M;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Cloudflare should proxy `vibeflow.com` to the server. Use Full Strict SSL after a valid origin certificate is installed.
