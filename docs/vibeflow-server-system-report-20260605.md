# vibeflow 서버 시스템 구조 조사 보고서

작성일: 2026-06-05 04:48 UTC  
대상 서버: `vibeflow-server`

---

## 1. 서버 기본 정보

- 호스트명: `vibeflow-server`
- OS: `Ubuntu 24.04.4 LTS (Noble Numbat)`
- 커널: `Linux 6.8.0-117-generic`
- 아키텍처: `x86_64`
- 현재 사용자 홈: `/home/ubuntu`
- 주요 서버 내부 IP: `192.168.0.100`
- 서버 외부 공인 IP 확인값: `121.176.74.101`

---

## 2. 하드웨어 리소스

### CPU

- 모델: `Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz`
- 물리 코어: 2
- 스레드: 4
- 아키텍처: x86_64
- 최대 클럭: 3.2GHz

### 메모리

- 총 RAM: 약 `15GiB`
- 사용 중: 약 `1.6GiB`
- 사용 가능: 약 `13GiB`
- Swap: `4.0GiB`, 사용 중 `0B`

---

## 3. 디스크 / 파티션 구조

서버에는 크게 두 개의 디스크가 확인됨.

### `/dev/sdb` — 시스템 디스크, 약 223GB

```text
/dev/sdb
├─ /boot/efi   1GB   vfat
├─ /boot       2GB   ext4
└─ LVM
   └─ /        100GB ext4
```

루트 파일시스템:

```text
/  총 98GB
   사용 18GB
   여유 76GB
   사용률 19%
```

### `/dev/sda` — 데이터 디스크, 약 931GB

```text
/dev/sda
├─ /backup    200GB ext4
├─ /storage   400GB ext4
└─ /projects  331GB ext4
```

현재 사용량:

- `/projects`: 326GB 중 약 249MB 사용
- `/storage`: 393GB 중 거의 미사용
- `/backup`: 196GB 중 거의 미사용

---

## 4. 주요 최상위 폴더 구조

```text
/
├─ backup
├─ bin
├─ boot
├─ cdrom
├─ dev
├─ etc
├─ home
├─ media
├─ mnt
├─ opt
├─ proc
├─ projects
├─ root
├─ run
├─ snap
├─ srv
├─ storage
├─ sys
├─ tmp
├─ usr
└─ var
```

데이터/서비스 관점의 핵심 디렉터리:

```text
/projects  - 프로젝트 앱 배치 위치
/storage   - 데이터 저장용으로 보이는 빈 파티션
/backup    - DB 백업 저장 위치
```

---

## 5. 네트워크 구조

활성 네트워크 인터페이스:

```text
lo       127.0.0.1/8
enp0s25  192.168.0.100/24
wlo1     DOWN
docker0  172.17.0.1/16, DOWN
```

기본 라우팅:

```text
1.1.1.1 via 192.168.0.1 dev enp0s25 src 192.168.0.100
```

DNS 확인 결과:

```text
vibeflow.kr          → Cloudflare IP
api.vibeflow.kr      → Cloudflare IP
app1.vibeflow.kr     → Cloudflare IP
app2.vibeflow.kr     → Cloudflare IP
monitor.vibeflow.kr  → Cloudflare IP
```

---

## 6. 열린 주요 포트

확인된 리스닝 포트:

```text
22      SSH, 외부 접근 가능
80      Nginx HTTP, 외부 접근 가능
443     Nginx HTTPS, 외부 접근 가능
3000    Ruby/Puma Rails 앱, 127.0.0.1 로컬 전용
4000    Python 앱, 0.0.0.0 외부 바인딩
5432    PostgreSQL, 127.0.0.1 로컬 전용
19999   Netdata, 외부 바인딩
8125    Netdata StatsD, 로컬 전용
4317    Netdata/OpenTelemetry 계열, 로컬 전용
53      systemd-resolved DNS, 로컬 전용
```

요약:

```text
외부 접근 가능:
- 22 SSH
- 80 HTTP
- 443 HTTPS
- 4000 Python app
- 19999 Netdata

로컬 전용:
- 3000 Ruby/Rails app
- 5432 PostgreSQL
- 8125 Netdata StatsD
- 4317 Netdata collector
```

---

## 7. 실행 중인 주요 서비스

`systemd` 기준 실행 중인 주요 서비스:

```text
nginx
postgresql@16-main
docker
containerd
ssh
netdata
fail2ban
cron
systemd-networkd
systemd-resolved
rsyslog
snapd
fwupd
ModemManager
wpa_supplicant
```

Docker 상태:

```text
Docker daemon: 실행 중
실행 중인 컨테이너: 없음
```

---

## 8. PostgreSQL 구조

PostgreSQL 클러스터:

```text
Version: 16
Cluster: main
Port: 5432
Status: online
Owner: postgres
Data directory: /var/lib/postgresql/16/main
Log file: /var/log/postgresql/postgresql-16-main.log
```

외부 공개 여부:

```text
127.0.0.1:5432 로컬 전용
```

---

## 9. Nginx 구조

활성화된 Nginx site:

```text
/etc/nginx/sites-enabled/default -> /etc/nginx/sites-available/default
/etc/nginx/sites-enabled/vibeflow -> /etc/nginx/sites-available/vibeflow
```

`vibeflow` site 설정 요약:

### 메인 홈페이지

```text
도메인: vibeflow.kr, www.vibeflow.kr
HTTPS: 443
root: /var/www/html
```

### API 서버

```text
도메인: api.vibeflow.kr
HTTPS: 443
proxy_pass: http://localhost:4000
```

### 웹앱 1

```text
도메인: app1.vibeflow.kr
HTTPS: 443
proxy_pass: http://localhost:3001
```

### 웹앱 2

```text
도메인: app2.vibeflow.kr
HTTPS: 443
proxy_pass: http://localhost:3002
```

### Netdata 모니터링

```text
도메인: monitor.vibeflow.kr
HTTPS: 443
proxy_pass: http://localhost:19999
```

### HTTP → HTTPS 리다이렉트

```text
80번 포트에서 다음 도메인을 HTTPS로 리다이렉트:
- vibeflow.kr
- www.vibeflow.kr
- api.vibeflow.kr
- app1.vibeflow.kr
- app2.vibeflow.kr
- monitor.vibeflow.kr
```

---

## 10. `/projects/4_Cartoon` 앱 조사

프로젝트 위치:

```text
/projects/4_Cartoon
```

앱 유형:

```text
Ruby on Rails 웹앱
```

확인된 주요 파일:

```text
Gemfile
Gemfile.lock
bin/rails
config/database.yml
.ruby-version
```

Ruby 요구 버전:

```text
3.3.11
```

Rails 버전:

```text
Rails 8.1.3
```

DB:

```text
SQLite
개발 DB: storage/development.sqlite3
테스트 DB: storage/test.sqlite3
프로덕션 DB: storage/production.sqlite3
```

주요 구조:

```text
/projects/4_Cartoon
├─ app
│  ├─ controllers
│  │  └─ projects_controller.rb
│  ├─ models
│  │  └─ project.rb
│  ├─ views
│  │  ├─ layouts
│  │  │  └─ application.html.erb
│  │  └─ projects
│  │     ├─ index.html.erb
│  │     ├─ new.html.erb
│  │     └─ show.html.erb
│  └─ assets
│     └─ stylesheets
│        └─ application.css
├─ config
│  └─ routes.rb
├─ public
│  └─ comics
├─ storage
│  ├─ development.sqlite3
│  └─ comic_jobs
├─ log
│  └─ development.log
└─ tmp
```

현재 실행 상태:

```text
127.0.0.1:3000
프로세스: puma 8.0.1
앱 이름: 4_Cartoon
```

로컬 접속 테스트 결과:

```text
http://127.0.0.1:3000/ → HTTP 200 OK
페이지 제목: 새 만화 리서치
```

임시 포트 3001 실행 테스트도 성공:

```bash
cd /projects/4_Cartoon
PIDFILE=/tmp/4_cartoon_3001.pid RBENV_VERSION=3.3.11 rbenv exec bundle exec rails server -b 127.0.0.1 -p 3001
```

테스트 결과:

```text
http://127.0.0.1:3001/ → HTTP 200 OK
<title>새 만화 리서치</title>
```

---

## 11. 4_Cartoon 외부 접속 관련 상태

Nginx는 현재 다음처럼 설정되어 있음:

```text
app1.vibeflow.kr → localhost:3001
```

하지만 현재 Rails 앱은:

```text
127.0.0.1:3000
```

에서 실행 중임.

따라서 현재 상태에서 `https://app1.vibeflow.kr` 접속 시 예상되는 문제:

```text
Nginx는 3001을 보는데 앱은 3000에 있음 → 502 Bad Gateway 가능
```

3001번으로 Rails 앱을 실행했을 때 추가로 확인된 문제:

```text
Blocked hosts: app1.vibeflow.kr
```

해결을 위해 필요한 Rails 설정:

파일:

```text
/projects/4_Cartoon/config/environments/development.rb
```

추가 필요:

```ruby
config.hosts << "app1.vibeflow.kr"
```

외부 공개를 위한 권장 구조:

```text
사용자 브라우저
  ↓
https://app1.vibeflow.kr
  ↓
Nginx :443
  ↓
localhost:3001
  ↓
4_Cartoon Rails/Puma
```

---

## 12. 백업 구조

백업 위치:

```text
/backup/db
```

확인된 DB 백업 파일:

```text
all_databases_20260529_020001.sql
all_databases_20260530_020001.sql
all_databases_20260531_020001.sql
all_databases_20260601_020001.sql
all_databases_20260602_020002.sql
all_databases_20260603_020001.sql
all_databases_20260604_020001.sql
all_databases_20260605_020001.sql
```

패턴상 매일 새벽 02:00경 전체 DB 백업이 생성되는 것으로 보임.

---

## 13. 전체 서비스 아키텍처 추정

```text
인터넷 / LAN
   │
   ▼
Cloudflare DNS
   │
   ▼
서버 공인 IP: 121.176.74.101
   │
   ▼
Nginx :80 / :443
   │
   ├─ vibeflow.kr
   │    └─ /var/www/html 정적 홈페이지
   │
   ├─ api.vibeflow.kr
   │    └─ localhost:4000 Python 앱
   │
   ├─ app1.vibeflow.kr
   │    └─ localhost:3001 Rails 앱용 슬롯
   │
   ├─ app2.vibeflow.kr
   │    └─ localhost:3002 웹앱 슬롯
   │
   └─ monitor.vibeflow.kr
        └─ localhost:19999 Netdata

PostgreSQL 16
   └─ localhost:5432

4_Cartoon Rails 앱
   └─ 현재 localhost:3000에서 실행 중

백업
   └─ /backup/db/*.sql
```

---

## 14. 운영상 권장 사항

### 4_Cartoon 외부 공개 시

1. Rails host 허용 추가

```ruby
config.hosts << "app1.vibeflow.kr"
```

2. 앱 포트와 Nginx proxy 포트 일치

현재 Nginx 기준이면 앱을 3001로 실행:

```bash
cd /projects/4_Cartoon
PIDFILE=/tmp/4_cartoon_3001.pid RBENV_VERSION=3.3.11 rbenv exec bundle exec rails server -b 127.0.0.1 -p 3001
```

또는 Nginx를 3000번으로 변경:

```nginx
proxy_pass http://localhost:3000;
```

3. 장기 실행용 systemd 서비스 등록 권장

예시:

```ini
[Unit]
Description=4_Cartoon Rails App
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/projects/4_Cartoon
Environment=RBENV_VERSION=3.3.11
Environment=RAILS_ENV=development
Environment=PIDFILE=/tmp/4_cartoon_3001.pid
ExecStart=/usr/bin/rbenv exec bundle exec rails server -b 127.0.0.1 -p 3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

4. 설정 반영 후 확인

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://app1.vibeflow.kr
```

### 보안 관점

- Netdata `19999`가 외부 바인딩되어 있음. 실제 외부 접근 정책 확인 권장.
- Python 앱 `4000`이 `0.0.0.0`에 직접 바인딩되어 있음. Nginx만 통해 접근하려면 로컬 바인딩 또는 방화벽 제한 검토 권장.
- PostgreSQL은 로컬 전용이므로 현재 구조는 안전한 편.
- Rails 개발 환경을 외부 공개할 경우, 운영 전환 또는 최소한 host/CORS/secret/log 설정 점검 필요.

---

## 15. 한 줄 요약

`vibeflow-server`는 Ubuntu 24.04 기반 단일 서버이며, `nginx + PostgreSQL 16 + Docker + Netdata`가 설치되어 있고, 데이터 디스크는 `/projects`, `/storage`, `/backup`으로 분리되어 있다. `/projects/4_Cartoon`은 Rails 8.1.3 웹앱이며 현재 로컬 `127.0.0.1:3000`에서 정상 실행 중이고, 외부 공개를 위해서는 `app1.vibeflow.kr → localhost:3001` 구조에 맞춰 앱 포트와 Rails host 허용 설정을 정리해야 한다.
