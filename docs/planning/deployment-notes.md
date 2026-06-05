# MemoryFlow 배포 · 스토리지 메모 (Deployment & Storage)

문서번호: MF-DEPLOY-2026-001
작성일: 2026-06-03
근거: memoryflow-prd.md v3.0 13·16장 + 인프라 협의(2026-06-03)
상태: 로컬 개발 우선 (서버 현재 다운). 서버 구조는 확정, 전환은 .env 교체.

---

## 0. 원칙 — 로컬을 서버와 같은 모양으로

로컬 개발 환경을 서버 토폴로지와 1:1로 맞춘다. 그러면 서버 복구 후 전환이
환경변수 교체로 끝난다. 경로를 코드에 박지 않는다.

```text
              로컬 (지금, Docker)            서버 (나중, D드라이브)
앱/백엔드      docker compose (컨테이너)      D:\projects
라이브 DB      ./data/memoryflow.sqlite      D:\projects\memoryflow.sqlite
STORAGE_ROOT   ./storage → 컨테이너 /data/storage   D:\storage
백업           ./backup                       D:\backup
```

---

## 1. 서버 디스크 구성 (확정)

```text
D 드라이브 (물리 1개)
├── \storage   (393GB)  파일 저장 (사진·영상·파생·산출물)
├── \projects  (326GB)  백엔드 프로그램 + 라이브 SQLite
└── \backup    (196GB)  DB(및 선택적 메타) 백업 사본
```

> 앱(C:) / 데이터(D:) 분리 의도였고, 실제로는 프로그램·데이터·백업이 모두 D:.

---

## 2. 스토리지 폴더 구조 (확정)

폴더 식별은 **프로젝트명이 아니라 project_id**로 한다(이름은 바뀌고 겹치고 특수문자 포함).

```text
{STORAGE_ROOT}\projects\{projectId}\
  uploads\
    images\        원본 사진      (PRD의 photos)
    videos\        원본 영상
  thumbnails\      480/1280 파생  (PRD 10장, 로컬 생성)
  outputs\         영상 제작용 내보내기 패키지 (PRD 11장)
  final-videos\    외부 제작 완성 MP4 (PRD 11장)
```

- DB에는 `STORAGE_ROOT` 기준 **상대경로**만 저장(서버 이전 시 루트만 바뀜).
- 사람이 알아볼 필요가 있으면 폴더명에 `{projectId}-{slug}` 형태로 슬러그 꼬리 허용(진실은 id).

---

## 3. ⚠️ 보안 — storage 직접 노출 금지 (PRD 13장)

```text
❌ 웹서버가 \storage 를 정적 디렉터리로 공개
   → URL 추측만으로 비공개 프로젝트 사진 유출
✅ \storage 는 웹 루트 밖. 앱 API(/api/media/:id)가
   세션 또는 공유 토큰 권한 확인 후 파일 스트리밍
   - 최종 영상: HTTP Range 지원(인라인 재생)
```

앞단(nginx 등): `/api/*` 와 앱만 외부 노출, `\storage` 직접 매핑 금지, HTTPS 필수.

---

## 4. ⚠️ 백업 — "있음"과 "안전함"은 다르다

현재 백업(D:\backup)은 storage·프로그램과 **같은 물리 디스크**에 있다.

| 위협 | D:\backup이 막아주나 |
|------|:---:|
| 실수 삭제 / DB 손상 / 덮어쓰기 | ✅ |
| **D: 디스크 물리 고장** | ❌ (전부 동시 소실) |

- MVP 시작으로는 허용(PRD 16장: 외부 3차 백업은 Phase 2).
- 단, **"디스크 고장엔 취약"**임을 인지. 가장 싼 보완은 D:\backup을
  **다른 물리 위치**(외장/타 서버/클라우드 1곳)로 주기 복사. 들어오는 순간 디스크 고장 생존.
- SQLite 백업 = 파일 복사. 일 1회 `memoryflow-YYYYMMDD.sqlite`로 복사.

---

## 5. 로컬 개발 (Docker) — 지금 진행

```text
docker compose
  app 컨테이너
    env: STORAGE_ROOT=/data/storage, DB_PATH=/data/db/memoryflow.sqlite
    volumes:
      ./storage : /data/storage     (호스트 폴더 마운트, 영상도 호스트에 남음)
      ./data/db : /data/db          (SQLite 영속화)
      ./backup  : /data/backup
  (선택) AI 백엔드: PRD 9장 동기 호출 대상 — 외부 API or 별 컨테이너, 추후 확정
```

체크:
```text
- SQLite: WAL 모드 + foreign_keys=ON
- 컨테이너 재시작에도 ./storage, ./data/db 가 사라지지 않게 볼륨 영속화
- .env.example 제공: STORAGE_ROOT, DB_PATH, (AI 키 등)
```

---

## 6. 미확정 (스택 재검토 시 — PRD 16장)

```text
- 백엔드 언어/프레임워크, 웹서버, 컨테이너 베이스 이미지
- AI 백엔드 구체(모델·실행 도구) — PRD 9장 동기 호출 대상
- 이미지/영상 처리 도구 구체(PRD 10장: 썸네일·프레임 추출)
```
위가 정해지면 02-TRD에 반영.
