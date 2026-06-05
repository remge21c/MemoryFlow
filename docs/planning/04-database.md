# MemoryFlow 데이터베이스 설계 (Database Design)

문서번호: MF-DB-2026-001
작성일: 2026-06-03
근거: memoryflow-prd.md v3.0 17장(데이터 구조 요약) + 검증/보강 반영
대상 DB: **SQLite 확정** (단일 서버·로컬 파일·소수 사용자에서 연역, PRD 16장과 일치).
> 아래 타입은 논리 타입. SQLite 매핑은 5절 참고. 확장 시 PostgreSQL 이전(표준 SQL 유지).

---

## 0. 설계 원칙

```text
1. 파일은 DB에 넣지 않는다. 경로(file_path)와 메타데이터만 저장. (PRD 13장)
2. 토큰 원본은 저장하지 않는다. token_hash만. (PRD 12장)
3. 영상 길이는 저장하지 않는다. media에서 계산. (PRD 8장)
4. 프로젝트당 스토리북 1개 (프로젝트의 최종 기록물).
5. 소유권: contribution.uploader_id 본인만 수정/삭제 (승인 전).
```

---

## 1. ERD 개요

```text
users ──< project_members >── projects ──< schedules ──< contributions ──< media
                                  │            (장면)        (기여 묶음)     (사진/영상)
                                  ├──< invites
                                  ├──< share_links
                                  ├──< project_videos
                                  └──1 storybooks ──< scene_narrations >── schedules
```

- `──<` : 1:N
- `──1` : 1:1
- `project_members` : users ↔ projects N:M (업로더 합류)

---

## 2. 테이블 정의

### users — 계정
```text
id              PK, bigint
name            varchar(60)   not null        -- 표시용. 중복 허용(동명이인)
phone           varchar(20)   not null UNIQUE -- 로그인 식별자 (PRD 4장 보강)
password_hash   varchar(255)  not null
is_admin        boolean       not null default false  -- 운영자 플래그 (PRD 3장 주석)
status          varchar(10)   not null default 'active' -- active | inactive
created_at      timestamp     not null default now()
```
- UNIQUE(phone) — 중복 가입 차단 + 로그인 식별.
- is_admin: PRD 3장 "다른 관리자 임명 등은 별도 역할 대신 계정 플래그로 처리".

### projects — 프로젝트
```text
id                    PK, bigint
name                  varchar(120)  not null
org_name              varchar(120)
description           text
cover_image_path      varchar(500)            -- 관리자 직접 업로드 (AI 생성은 Phase 2)
start_date            date          not null
end_date              date          not null
status                varchar(12)   not null default 'active' -- active|completed|archived
default_photo_seconds int           not null default 3        -- 영상 길이 계산 기본값
created_by            FK -> users.id not null  -- 생성한 관리자
created_at            timestamp     not null default now()
```
- CHECK(end_date >= start_date).
- Day는 별도 테이블 없이 start~end_date로 파생(day_index). 일정이 Day를 참조.

### project_members — 프로젝트 합류 (N:M) [PRD 17장에 없던 보강]
```text
id           PK, bigint
project_id   FK -> projects.id   not null
user_id      FK -> users.id      not null
role         varchar(10) not null default 'uploader' -- uploader (admin은 created_by/is_admin로)
status       varchar(10) not null default 'active'   -- active | removed (멤버 내보내기)
joined_at    timestamp   not null default now()
```
- UNIQUE(project_id, user_id) — 한 프로젝트 1회 합류.
- **보강 근거:** PRD 4장 "들어온 사람은 멤버 목록에 자동 표시 / 관리자가 사후 내보내기·비활성화".
  멤버십과 그 상태(removed)는 프로젝트 단위라, 전역 users.status만으로는 표현 불가.

### schedules — 세부일정 = 장면(scene)
```text
id            PK, bigint
project_id    FK -> projects.id   not null
day_index     int          not null         -- 1,2,3... (start_date 기준)
time          varchar(20)                    -- 표시용 시간(예: '19:00')
title         varchar(120) not null
place         varchar(120)
category      varchar(40)
sort_order    int          not null default 0
photo_seconds int                            -- nullable. null이면 projects.default_photo_seconds
```
- INDEX(project_id, day_index, sort_order) — 일정 목록 정렬 조회.

### contributions — 업로더별 기여 묶음
```text
id           PK, bigint
project_id   FK -> projects.id    not null   -- 비정규화(권한/조회 편의), schedule로도 도달 가능
schedule_id  FK -> schedules.id   not null
uploader_id  FK -> users.id       not null   -- 소유자. 본인만 수정/삭제(승인 전)
story_text   text                            -- 이 관점의 스토리
sort_order   int          not null default 0
created_at   timestamp    not null default now()
updated_at   timestamp    not null default now()
```
- INDEX(schedule_id) — 장면 열 때 기여 펼침.
- INDEX(uploader_id) — 본인 기여 조회.
- 한 장면에 같은 업로더가 여러 기여를 가질 수 있음(제약 두지 않음). 보통 장면당 2~3명.

### media — 기여에 속한 사진/영상
```text
id                PK, bigint
contribution_id   FK -> contributions.id  not null
type              varchar(6)  not null     -- photo | video
file_path         varchar(500) not null    -- /mnt/data 상대경로
file_hash         varchar(64)              -- nullable. 완전 동일파일 차단(선택, PRD 6장)
duration_seconds  numeric(6,2)             -- video만. 길이 계산에 사용
included          boolean not null default true -- 스토리북 선별 포함/제외 토글
sort_order        int     not null default 0
thumb_path        varchar(500)             -- 480px 썸네일 (PRD 10장, 로컬 생성)
preview_path      varchar(500)             -- 1280px 미리보기
created_at        timestamp not null default now()
```
- INDEX(contribution_id).
- INDEX(file_hash) WHERE file_hash IS NOT NULL — 선택적 중복 차단용.
- 장면 길이 계산: Σ(photo included × photo_seconds) + Σ(video included × duration_seconds).

### storybooks — 프로젝트 최종 기록물 (1:1)
```text
id             PK, bigint
project_id     FK -> projects.id  not null UNIQUE  -- 프로젝트당 1개
status         varchar(10) not null default 'draft' -- draft | approved
is_edit_locked boolean    not null default false    -- 승인 전 업로더 입력 차단 (보강)
approved_at    timestamp
approved_by    FK -> users.id
created_at     timestamp  not null default now()
```
- UNIQUE(project_id).
- is_edit_locked: PRD 7장 "편집 잠금" 보강. 승인되면 항상 잠김.

### scene_narrations — 장면별 합쳐진 내레이션
```text
id             PK, bigint
storybook_id   FK -> storybooks.id  not null
schedule_id    FK -> schedules.id   not null
narration_text text                         -- AI 합치기 결과를 사람이 확정한 최종 내레이션
updated_at     timestamp not null default now()
```
- UNIQUE(storybook_id, schedule_id) — 장면당 내레이션 1개.
- PRD 17장 "scene 내레이션은 schedule 단위로 보관(또는 별 테이블)" → 별 테이블로 확정.

### invites — 프로젝트별 초대 링크
```text
id          PK, bigint
project_id  FK -> projects.id  not null
token_hash  varchar(64)  not null UNIQUE   -- 원본 토큰 미저장
is_active   boolean not null default true
expires_at  timestamp not null
created_by  FK -> users.id
created_at  timestamp not null default now()
```
- UNIQUE(token_hash). 검증: hash 조회 → is_active → expires_at.

### share_links — 외부 공유 링크
```text
id          PK, bigint
project_id  FK -> projects.id  not null
token_hash  varchar(64)  not null UNIQUE
is_active   boolean not null default true
expires_at  timestamp not null              -- 30/60/120/180/360일 (기본 30)
created_at  timestamp not null default now()
```
- UNIQUE(token_hash). 승인된 공개 데이터만 반환(PRD 12장).

### project_videos — 외부 제작 완성 영상
```text
id          PK, bigint
project_id  FK -> projects.id  not null
file_path   varchar(500) not null
status      varchar(10) not null default 'uploaded' -- uploaded | published | hidden
created_at  timestamp not null default now()
```
- 인라인 재생 위해 스트리밍 시 HTTP Range 지원(PRD 13장, 앱 레벨).

---

## 3. 핵심 제약·규칙 요약

```text
잠금   storybooks.status=approved 또는 is_edit_locked=true 면
       해당 project의 contributions/media 쓰기 차단 (앱 레벨 가드 + 가능하면 DB 제약)
소유   contributions/media 수정·삭제는 uploader_id=현재 사용자 AND 미잠금일 때만
토큰   invites/share_links 는 token_hash만. 원본 비저장
삭제   project 삭제 시 하위(schedules·contributions·media·storybook·links) CASCADE
       단, 파일 실삭제는 앱이 file_path 수집 후 별도 수행
```

---

## 4. PRD 17장 대비 보강 내역 (정당화)

| 항목 | 보강 | 근거 |
|------|------|------|
| users.phone, is_admin | 추가 | PRD 4장(로그인 식별자), 3장(관리자 플래그) |
| project_members 테이블 | 신설 | PRD 4장(멤버 자동표시·내보내기). N:M·per-project 상태 필요 |
| storybooks.is_edit_locked | 추가 | PRD 7장 편집 잠금 보강 |
| scene_narrations 테이블 | 신설 | PRD 17장 "별 테이블" 옵션 채택 |
| media.thumb/preview_path, file_hash | 추가 | PRD 10장(파생 이미지), 6장(완전동일 차단 선택) |
| created_at / updated_at | 추가 | 운영·감사 최소 메타. 무해 |

### 4.1 확정 모델링 결정 (Justified — PRD 연역) [2026-06-03]

| 결정 | 확정 | 연역 경로 | 뒤집는 조건 |
|------|------|-----------|-------------|
| 관리자/업로더 구분 | 관리자=`users.is_admin` 플래그 + `projects.created_by`, 업로더=`project_members` 합류 | PRD 3장 "관리자는 별도 역할 아닌 계정 플래그". 멤버 명단(자동표시·내보내기)은 업로더 대상 | 관리자도 프로젝트별 멤버십·권한 차등이 필요해지면 project_members.role에 admin 추가 |
| 스토리북 개수 | 프로젝트당 1개 (storybooks.project_id UNIQUE) | PRD 7장 "스토리북 = 프로젝트의 최종 기록물"(단수) | 같은 프로젝트로 복수 버전(짧은/긴) 산출이 필요해지면 UNIQUE 해제 + 버전 컬럼 |

---

## 5. 기술 스택 — SQLite 확정 [2026-06-03]

연역: 단일 서버 + 로컬 파일 스토리지 + 소수 사용자(장면당 2~3명) → 별도 DB 서버 불필요.
파일은 DB가 아니라 디스크에 저장(0번 원칙)하므로 사진·영상 크기는 DB와 무관.
운영 단순함(파일 하나 = DB)이 PRD 16장 "MVP는 가볍게·수동"과 맞물림.

### SQLite 타입 매핑
```text
bigint PK       → INTEGER PRIMARY KEY (rowid, autoincrement)
boolean         → INTEGER 0/1
timestamp       → TEXT (ISO8601, UTC 저장) 또는 INTEGER(epoch)
date            → TEXT ('YYYY-MM-DD')
numeric(6,2)    → REAL
varchar/text    → TEXT (SQLite는 길이 강제 없음, 앱에서 검증)
```

### 운영 설정
```text
- WAL 모드 ON: 읽기-쓰기 동시성 확보 (PRAGMA journal_mode=WAL)
- 외래키 ON:   PRAGMA foreign_keys=ON (SQLite는 기본 OFF)
- 잠금 강제:   앱 레벨 가드 우선(트리거는 선택). 단일 프로세스라 단순
- file_hash:   sha-256 (64자 hex)
```

### 배포 위치 (로컬 우선 → 서버)
```text
                로컬(Docker, 지금)            서버(D드라이브, 나중)
라이브 DB       ./data/memoryflow.sqlite     D:\projects\memoryflow.sqlite
STORAGE_ROOT    ./storage (→/data/storage)   D:\storage
백업            ./backup                     D:\backup (일 1회 파일 복사)
```
경로는 코드에 박지 않고 STORAGE_ROOT / DB_PATH 환경변수로만 접근.
→ 로컬→서버 전환 = .env 교체. 상세는 `docs/planning/deployment-notes.md`.

### 확장 신호 (그때 PostgreSQL 이전)
```text
다중 앱 인스턴스 / 동시 업로더 수십+ / 관리자 동시편집 폭증 → PG 이전
스키마가 표준 SQL이라 이전 부담 작음
```
