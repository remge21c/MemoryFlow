# MemoryFlow 운영 가이드

## 서버 디렉터리 구성

vibeflow-server에서는 다음 경로를 기준으로 운영한다.

```text
/opt/memoryflow                  앱 소스 체크아웃 위치
/mnt/data/storage/memoryflow     업로드 미디어 및 생성 산출물
/mnt/data/postgres/memoryflow    PostgreSQL 데이터 볼륨
/mnt/data/backup/memoryflow      D 하드 데이터 백업 위치
```

앱 컨테이너는 기본적으로 `127.0.0.1:3000`에만 바인딩한다. 외부 접속은 Nginx와 Cloudflare를 통해 처리한다.

## 최초 배포

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

웹 컨테이너는 시작할 때 `prisma migrate deploy`를 먼저 실행한 뒤 Next.js 서버를 시작한다.

## 필수 운영 환경변수

`.env.production`에는 다음 값을 실제 운영 값으로 채워야 한다.

```text
POSTGRES_PASSWORD    긴 랜덤 비밀번호. 예시 값을 그대로 쓰면 안 됨
SESSION_SECRET       최소 32자 이상의 긴 랜덤 문자열
APP_BASE_URL         https://vibeflow.com
APP_BIND             Nginx 사용 시 127.0.0.1
APP_PORT             3000
STORAGE_DIR          /mnt/data/storage/memoryflow
POSTGRES_DATA_DIR    /mnt/data/postgres/memoryflow
BACKUP_ROOT          /mnt/data/backup/memoryflow
OPENAI_API_KEY       개발 중에는 비워도 되지만 실제 AI 검수에는 필요
OPENAI_MODEL         gpt-4o-mini
```

Ubuntu에서 랜덤 값을 만들 때는 다음 명령을 사용한다.

```bash
openssl rand -base64 36
```

## 운영 사전 점검

최초 배포 전, 또는 `.env.production`을 수정한 뒤에는 반드시 실행한다.

```bash
cd /opt/memoryflow
sh scripts/production-check.sh
```

이 스크립트는 다음을 확인한다.

- 필수 환경변수 존재 여부
- 예시 비밀번호를 그대로 사용했는지 여부
- `SESSION_SECRET` 길이
- PostgreSQL, 파일 스토리지, 백업 디렉터리 생성 및 쓰기 가능 여부
- Docker Compose 설정 유효성

## 업데이트 배포

GitHub `main` 브랜치의 최신 코드를 서버에 반영할 때 사용한다.

```bash
cd /opt/memoryflow
ENV_FILE=.env.production APP_DIR=/opt/memoryflow BRANCH=main sh scripts/deploy.sh
```

이 스크립트는 다음 작업을 수행한다.

- `origin/main` 가져오기
- 웹 이미지 재빌드
- PostgreSQL 및 웹 컨테이너 재시작
- 사용하지 않는 Docker 이미지 정리

## 상태 확인

```bash
curl -fsS http://127.0.0.1:3000/api/health
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker logs --tail=100 memoryflow-web
```

정상 응답 예시는 다음과 같다.

```json
{"ok":true,"service":"memoryflow"}
```

## 백업 정책

프로젝트 진행 기간에는 매일 1회 백업한다.

```bash
cd /opt/memoryflow
BACKUP_TYPE=daily RETENTION_DAYS=60 sh scripts/backup.sh
```

프로젝트 기간 외에는 7일마다 1회 백업한다.

```bash
cd /opt/memoryflow
BACKUP_TYPE=weekly RETENTION_DAYS=365 sh scripts/backup.sh
```

백업 결과는 다음 구조로 저장된다.

```text
/mnt/data/backup/memoryflow/{daily|weekly|snapshot}/{timestamp}/db.sql
/mnt/data/backup/memoryflow/{daily|weekly|snapshot}/{timestamp}/storage/
/mnt/data/backup/memoryflow/{daily|weekly|snapshot}/{timestamp}/manifest.txt
```

`RETENTION_DAYS`를 지정하면 해당 일수보다 오래된 같은 타입의 백업 폴더를 정리한다.

## Cron 예시

프로젝트 진행 기간 중 매일 새벽 3시 백업:

```cron
0 3 * * * cd /opt/memoryflow && BACKUP_TYPE=daily RETENTION_DAYS=60 sh scripts/backup.sh >> /var/log/memoryflow-backup.log 2>&1
```

프로젝트 기간 외 매주 일요일 새벽 3시 백업:

```cron
0 3 * * 0 cd /opt/memoryflow && BACKUP_TYPE=weekly RETENTION_DAYS=365 sh scripts/backup.sh >> /var/log/memoryflow-backup.log 2>&1
```

## 복구

복구는 기존 데이터베이스와 파일 스토리지를 교체하는 작업이다. 반드시 신중하게 실행한다.

먼저 웹 컨테이너를 중지한다.

```bash
cd /opt/memoryflow
docker compose --env-file .env.production -f docker-compose.prod.yml stop web
```

백업 폴더를 지정해 복구한다.

```bash
CONFIRM=RESTORE BACKUP_DIR=/mnt/data/backup/memoryflow/daily/yyyymmdd-hhmmss sh scripts/restore.sh
```

복구 후 웹 컨테이너를 다시 시작한다.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d web
```

`CONFIRM=RESTORE`를 넣지 않으면 복구 스크립트는 실행되지 않는다.

## Nginx / Cloudflare

Nginx는 `vibeflow.com` 요청을 로컬 앱 포트로 전달한다.

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

Cloudflare는 `vibeflow.com`을 서버로 프록시한다. 서버에 유효한 Origin Certificate 또는 TLS 인증서를 설치한 뒤 Cloudflare SSL 모드는 `Full Strict`를 사용한다.

## 운영 메모

- `.env.production`은 서버에만 둔다. Git에 커밋하지 않는다.
- `OPENAI_API_KEY`가 없어도 로컬 fallback AI 검수로 UX 확인은 가능하다.
- 실제 AI 검수를 운영하려면 `OPENAI_API_KEY`를 설정해야 한다.
- 데이터베이스와 업로드 파일은 `/mnt/data` 아래에 저장한다.
- 영상 제작은 A18 로컬 노트북에서 Remotion/VideoFlow로 진행하고, 완성된 영상 파일만 MemoryFlow에 업로드한다.
