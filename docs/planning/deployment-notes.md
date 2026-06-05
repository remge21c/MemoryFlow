# MemoryFlow 배포 및 스토리지 가이드 (Deployment & Storage)

문서번호: MF-DEPLOY-2026-002
작성일: 2026-06-06
근거: vibeflow-server 실장 구조 및 배포 제약 조건 반영
상태: 배포 준비 완료 (시스템 디스크 배포 및 데이터 디스크 스토리지 분리 구조 확정)

---

## 0. 배포 아키텍처 개요
`vibeflow-server` (Ubuntu 24.04) 환경에 MemoryFlow 애플리케이션을 배포하기 위한 최종 아키텍처 매핑 정보입니다.

```text
                  로컬 개발 환경                     vibeflow-server 실 운영 환경
애플리케이션 코드     로컬 워크스페이스                    /var/www/memoryflow (시스템 디스크 /dev/sdb)
라이브 데이터베이스   ./data/db/memoryflow.sqlite        /storage/memoryflow/db/memoryflow.sqlite (데이터 디스크 /dev/sda)
STORAGE_ROOT      ./storage                          /storage/memoryflow/media (데이터 디스크 /dev/sda)
도메인 / 포트        localhost:5173 / localhost:4000     memoryflow.vibeflow.kr (Nginx :443 -> 백엔드 :5000)
```

---

## 1. 물리 디스크 매핑 및 폴더 구조

사용자 제약 조건에 따라 프로그램 본체는 **시스템 디스크 (`/dev/sdb` LVM `/` 파티션)**에 설치하며, 미디어 및 데이터베이스는 대용량 **데이터 디스크 (`/dev/sda` 의 `/storage` 파티션, 약 400GB)**를 활용합니다.

### 📂 애플리케이션 코드 위치 (시스템 디스크 `/dev/sdb`)
- **경로**: `/var/www/memoryflow`
- 깃허브 레포지토리의 최신 릴리즈가 배포되며 프론트엔드 정적 파일 빌드 결과물(`client/dist`)이 이곳에 위치합니다.

### 📂 스토리지 및 데이터베이스 위치 (데이터 디스크 `/dev/sda`)
- **데이터베이스 경로**: `/storage/memoryflow/db/memoryflow.sqlite`
- **미디어 업로드 경로 (STORAGE_ROOT)**: `/storage/memoryflow/media`
  
  `STORAGE_ROOT` 하위는 프로젝트 ID별로 다음과 같이 저장 및 관리됩니다:
  ```text
  /storage/memoryflow/media/
  └── projects/
      └── {projectId}/
          ├── uploads/
          │   ├── images/      # 업로더가 등록한 원본 사진 (.jpg, .png 등)
          │   └── videos/      # 업로더가 등록한 원본 동영상 (.mp4 등)
          ├── thumbnails/      # 프론트 최적화용 압축 썸네일 파일
          ├── outputs/         # 비디오 패키지 제작용 임시 파일
          └── final-videos/    # 최종 인코딩 및 내보내기 완료된 완성본 비디오 (.mp4)
  ```

---

## 2. 서버 환경 설정 (`.env`)
서버의 `/var/www/memoryflow/.env` 파일 설정:
```env
PORT=5000
STORAGE_ROOT=/storage/memoryflow/media
DB_PATH=/storage/memoryflow/db/memoryflow.sqlite
SESSION_SECRET=a-random-secure-secret-key-32-chars-or-more
AI_PROVIDER=gemini
GEMINI_API_KEY=<발급받은_Gemini_API_Key_입력>
AI_MODEL=gemini-2.5-flash
```

---

## 3. Nginx 가상 호스트 설정 (`memoryflow.vibeflow.kr`)
경로: `/etc/nginx/sites-available/memoryflow`

```nginx
server {
    listen 80;
    server_name memoryflow.vibeflow.kr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name memoryflow.vibeflow.kr;

    # SSL 와일드카드 인증서 경로 지정
    ssl_certificate /etc/letsencrypt/live/vibeflow.kr/fullchain.pem; 
    ssl_certificate_key /etc/letsencrypt/live/vibeflow.kr/privkey.pem;

    # React 프론트엔드 정적 파일 직접 서빙
    root /var/www/memoryflow/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 백엔드 API 프록시 처리
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 고용량 미디어 파일 전송을 위한 크기 조정
        client_max_body_size 50M;
    }
}
```

---

## 4. 백엔드 서비스 관리 (Systemd)
경로: `/etc/systemd/system/memoryflow.service`

```ini
[Unit]
Description=MemoryFlow Node Backend Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/memoryflow
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 5. GitHub Actions를 통한 자동 배포 (CI/CD) 및 알림
GitHub의 `main` 브랜치에 푸시가 발생할 때 실행되는 워크플로우를 구성합니다.

### 배포 워크플로우 동작 단계
1. **서버 SSH 접속**: GitHub Runner가 SSH 키를 통해 서버(`121.176.74.101`)에 원격 접속합니다.
2. **코드 갱신**: `/var/www/memoryflow` 경로로 이동하여 깃 풀을 실행합니다 (`git pull origin main`).
3. **종속성 및 빌드**: `pnpm install --frozen-lockfile` 및 `pnpm build`를 순차 실행합니다.
4. **마이그레이션**: `pnpm migrate`를 통해 Drizzle ORM 데이터베이스 스키마를 업데이트합니다.
5. **서비스 재시작**: `sudo systemctl restart memoryflow`로 서버 백엔드를 재시작합니다.
6. **상태 검증 및 텔레그램 발송**: `http://localhost:5000/api/health` 헬스체크 결과에 따라 성공 혹은 실패 메시지를 텔레그램 봇 API를 통해 관리자 방으로 전송합니다.
