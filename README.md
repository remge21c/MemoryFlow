# MemoryFlow

여러 사람이 함께 참여한 여행·수련회·행사의 사진/영상/스토리를 **일정(장면) 단위**로 모아,
짧은 스토리 영상의 **대본 스토리북**으로 정리하는 웹 애플리케이션.

> 기획 근거: [`docs/memoryflow-prd.md`](docs/memoryflow-prd.md) (PRD v3.0) · [`docs/planning/02-trd.md`](docs/planning/02-trd.md) (스택) · [`specs/`](specs) (화면 명세)

## 스택

TypeScript 모노레포 (pnpm workspace) — `shared` / `server` / `client`

- **client** — React + Vite + Tailwind v4 + TanStack Query + Zustand (모바일 우선)
- **server** — Fastify + Drizzle ORM + better-sqlite3 (SQLite WAL) + Sharp + fluent-ffmpeg
- **shared** — zod 스키마 · 영상 길이 모델 · DTO 타입 (client/server 공유)

## 빠른 시작

```bash
pnpm install            # 네이티브 모듈(better-sqlite3/sharp) 빌드 포함
pnpm migrate            # SQLite 스키마 생성
pnpm seed               # (선택) 관리자 + 샘플 프로젝트 시드
pnpm dev                # server(:4000) + client(:5173) 동시 기동
```

브라우저에서 http://localhost:5173 접속.

### 시드 계정

| 역할 | 전화번호 | 비밀번호 |
|------|----------|----------|
| 관리자 | `01000000000` | `admin123` |
| 업로더 | `01011111111` | `pass123` |

시드를 쓰지 않으면 로그인 화면의 **"관리자 계정 부트스트랩"**으로 첫 관리자를 만든다(사용자 0명일 때만).

## 환경변수 (`.env`, 루트)

`/.env.example` 복사. 핵심: `STORAGE_ROOT`, `DB_PATH`, `SESSION_SECRET`, `AI_PROVIDER`.
로컬→서버 전환은 이 파일만 교체한다(경로를 코드에 박지 않음 — [`docs/planning/deployment-notes.md`](docs/planning/deployment-notes.md)).

### AI (PRD 9장)

기본 `AI_PROVIDER=stub` — API 키 없이도 로컬 스텁이 스토리 합치기/요약을 수행한다.
실제 LLM을 쓰려면 `.env`에 `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`를 설정한다. 어댑터: `server/src/services/ai.ts`.

## 스크립트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | server + client 동시 개발 모드 |
| `pnpm build` | shared → server → client 프로덕션 빌드 |
| `pnpm typecheck` | 전체 패키지 타입체크 |
| `pnpm migrate` / `pnpm seed` | DB 스키마 생성 / 시드 |

## 디렉터리

```
shared/   zod 스키마 · 길이 모델 · DTO
server/   Fastify API (routes/ services/ db/ lib/)
client/   React SPA (pages/ components/ lib/)
storage/  업로드 원본·파생·산출물 (gitignore, STORAGE_ROOT)
data/db/  SQLite 파일 (gitignore)
docs/     기획·디자인 문서   specs/  화면 명세
```
