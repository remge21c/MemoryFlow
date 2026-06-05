# MemoryFlow 기술 요구사항 (TRD)

문서번호: MF-TRD-2026-001
작성일: 2026-06-03
근거: memoryflow-prd.md v3.0 + 스택 협의(2026-06-03). 모든 선택은 제약에서 연역.
관련: 04-database.md(SQLite), deployment-notes.md(인프라), 06-screens.md(화면)

---

## 0. 스택 한눈에

```text
언어    TypeScript 전 영역 (AI 보조 1인 개발 → 단일 언어로 마찰 최소화)
구조    client/ (React SPA) + server/ (Fastify API) 분리

프론트  React + Vite + TypeScript
        TailwindCSS (모바일 우선)
        TanStack Query (서버 상태) + Zustand (클라 상태, 에디터)
        Zod (입력 검증, 서버와 스키마 공유)

백엔드  Node + Fastify + TypeScript
        Drizzle ORM + better-sqlite3 (SQLite 동기 드라이버)
        세션 쿠키 인증 (전화번호+비밀번호)
        Zod (요청 검증)

미디어  Sharp (썸네일 480/1280/1920)
        fluent-ffmpeg + ffmpeg 바이너리 (영상 프레임 추출·커버)

DB      SQLite (WAL, foreign_keys=ON) — 04-database.md
```

---

## 1. 아키텍처 — 왜 분리(Fastify+React)인가

이 앱은 **미디어 중심**(업로드·Range 스트리밍·썸네일/프레임 추출)이다. 파일
스트리밍과 장시간 처리를 명시적 백엔드가 제어하는 편이 자연스럽다. 서버/클라
관심사가 분리되고, 배포는 D:\projects에 Node 서버 1개로 단순하다.

```text
[브라우저 SPA]  ──HTTP──>  [Fastify API]  ──>  SQLite
   React                      │  ├─ Sharp / ffmpeg (미디어 파생)
   TanStack Query             │  ├─ 파일 I/O → STORAGE_ROOT
   Zustand(에디터)            │  └─ AI 백엔드 동기 호출 (PRD 9장)
                              │
   /share/:token (공유 열람)  ─ 서버가 권한 검증 후 데이터/미디어 반환
```

### 라우트 구분
```text
/api/*              인증(세션) 필요한 앱 API
/api/media/:id      세션 또는 공유토큰 검증 후 파일 스트리밍 (Range 지원)
/share/:token       비로그인 공유 열람 (승인된 공개 데이터만)
/join/:token        초대 진입 → 가입/합류
```

---

## 2. 폴더 구조

```text
memoryflow/
├── client/                 React + Vite SPA
│   ├── src/
│   │   ├── pages/          화면 (06-screens.md의 S-01~S-30)
│   │   ├── components/
│   │   ├── lib/            api 클라이언트, query 훅
│   │   └── stores/         zustand (에디터 상태)
│   └── vite.config.ts      dev: /api → server 프록시
├── server/                 Fastify API
│   ├── src/
│   │   ├── routes/         api / media / share / join
│   │   ├── db/             drizzle 스키마·마이그레이션 (04-database.md)
│   │   ├── services/       media(sharp/ffmpeg), ai, storybook, auth
│   │   ├── lib/            storage(STORAGE_ROOT 경로 해석), hash, session
│   │   └── app.ts
│   └── drizzle.config.ts
├── shared/                 zod 스키마·타입 (client/server 공유)
├── storage/                (gitignore) 로컬 파일 — STORAGE_ROOT
├── data/db/                (gitignore) 로컬 SQLite
├── docker-compose.yml
└── .env.example            STORAGE_ROOT, DB_PATH, AI_*, SESSION_SECRET
```

---

## 3. 핵심 기술 결정 (연역)

### 인증 — 세션 쿠키
```text
전화번호+비밀번호 → 서버 검증 → httpOnly 세션 쿠키 발급
JWT 불필요(단일 서버, 토큰 분산 필요 없음). 세션은 SQLite 또는 서명 쿠키.
비밀번호: bcrypt/argon2 해시. 재설정은 관리자 임시 비밀번호(PRD 4장, 이메일은 Phase 2).
```

### 미디어 업로드·파생 (PRD 10장)
```text
업로드 → STORAGE_ROOT/projects/{id}/uploads/(images|videos) 저장
       → DB media 행 생성(상대경로)
사진:  Sharp로 thumbnails/ 에 480·1280 (+1920 커버후보) 생성
영상:  fluent-ffmpeg로 1초 프레임 추출 → 커버후보 thumbnails/ 저장
       duration_seconds 추출해 저장(영상 길이 계산용, PRD 8장)
완전동일 차단(선택): sha-256 file_hash 비교 (PRD 6장)
```

### 미디어 스트리밍 (PRD 13장)
```text
storage 직접 노출 금지. /api/media/:id 가 권한(세션/공유토큰) 확인 후 스트림.
영상: HTTP Range 지원(인라인 재생). Fastify 스트림 + Range 헤더 처리.
```

### AI 동기 호출 (PRD 9장)
```text
편집 화면 버튼 → 서버가 AI 백엔드 동기 호출 → 초안 반환.
큐 없음. 타임아웃 30초, 실패 시 에러 응답 → 프론트가 [다시 시도] 노출.
AI 백엔드 구체(모델/엔드포인트)는 미확정 → 어댑터(services/ai)로 추상화.
```

### 영상 길이 계산 (PRD 8장)
```text
서버 계산: Σ(included photo × photo_seconds) + Σ(included video × duration_seconds)
photo_seconds = schedule.photo_seconds ?? project.default_photo_seconds
저장하지 않고 조회 시 계산.
```

### 내보내기 패키지 (PRD 11장)
```text
승인된 스토리북 → outputs/ 에 project.json + scene-timeline.json + 미디어 묶음 생성.
scene-timeline.json 은 8장 길이 모델과 1:1.
```

---

## 4. 개발 환경 (로컬 우선, Docker)

```text
dev:
  client  vite dev (HMR), /api → server 프록시
  server  tsx watch, better-sqlite3 로컬 파일
  docker-compose: app 컨테이너 + 볼륨(./storage, ./data/db, ./backup)
  ffmpeg: 컨테이너 이미지에 포함
검증:
  SQLite WAL + foreign_keys=ON
  .env: STORAGE_ROOT=/data/storage, DB_PATH=/data/db/memoryflow.sqlite
```

배포(서버 복구 후): D:\projects 에 Node 서버 1개. 경로는 .env만 교체
(STORAGE_ROOT=D:\storage, DB_PATH=D:\projects\memoryflow.sqlite). deployment-notes.md 참조.

---

## 5. 미확정 (추후 확정)

```text
- Node LTS 버전 / 패키지 매니저(pnpm 권장) — 부트스트랩 시 고정
- AI 백엔드 구체: 모델·엔드포인트·인증 (PRD 9장) — services/ai 어댑터 뒤로 숨김
- 앞단 리버스 프록시(nginx 등) + HTTPS 인증서 — 서버 배포 시
- 세션 저장 방식 최종(SQLite 테이블 vs 서명 쿠키) — 구현 시 택1
```
