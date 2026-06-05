# Stargate Report — MemoryFlow

생성: 2026-06-03 · 파이프라인 라인: **doubt(의심·검증)** → 직접 구현 빌드

## Pipeline Summary

| Phase | 단계 | 상태 | 산출물 |
|-------|------|------|--------|
| 0 | 진입 — 아이디어 | ✅ (기존) | `docs/memoryflow-prd.md` (PRD v3.0) |
| 1 | 심층 기획 (doubt) | ✅ (기존) | `docs/planning/` (TRD·DB·검증·배포) |
| 2 | 기획 리뷰 | — | (생략) |
| 3 | 명세 생성 | ✅ (기존) | `specs/screens/*.yaml` ×18, `specs/domain/resources.yaml` |
| 3.5 | Validation (doubt) | ✅ | 핵심 가정 3종 **모두 설계로 해소(RESOLVED)** — `11-validation-plan.md` |
| 4 | **빌드** | ✅ (이번 세션) | 풀스택 앱 (`client/` `server/` `shared/`) |
| 5 | 자가개선 | ✅ 부분 | 빌드 중 4건 자가 수정 (아래) |
| 6 | 리포트 | ✅ | 본 문서 + `README.md` |

> stargate 진입 시 기획·명세·검증·디자인이 모두 완료된 상태였으므로, Phase 4(빌드)가 이번 세션의 핵심.
> 단일 에이전트 환경(cmux 아님)이라 빌드 오케스트레이션 스킬 대신 **직접 구현**으로 디스패치.

## 무엇을 만들었나

TypeScript 모노레포 (pnpm workspace) — TRD 02 스택을 그대로 연역 구현.

```
shared/  zod 스키마 + 영상 길이 모델(PRD 8장) + DTO 타입       (4 src 파일)
server/  Fastify + Drizzle + better-sqlite3 + Sharp + ffmpeg   (28 src 파일)
client/  React + Vite + Tailwind v4 + TanStack Query + Zustand (33 src 파일)
```

### 화면 (16/16, 명세 S-01~S-30 전체)

공통 로그인·초대가입 · 업로더(내 프로젝트/일정/기여) · 관리자(대시보드·생성·상세허브·일정설계·초대·멤버·**스토리북 편집★**·승인/잠금·공유·내보내기/영상) · 공유 열람.
디자인은 `docs/design-system/`(Warm Minimalism, 테라코타 #94451d)을 토큰째 이식.

### 서버 API (도메인 리소스 전부)

auth · join · projects · schedules · members · invites · contributions · media(업로드+Range 스트리밍) · storybook(집계/내레이션/AI/승인/잠금) · share(공개) · videos · export.

핵심 규칙 구현: 전화번호 유니크 로그인, 초대=신뢰근거 자동합류, **토큰 해시만 저장**(PRD 12장), 소유권·잠금 가드(types.yaml), **storage 직접노출 금지 + 권한 스트리밍**(PRD 13장), 영상 길이 = Σ(사진×노출초)+Σ(영상길이) 서버 계산(PRD 8장), AI 동기호출+30초 타임아웃+스텁 폴백(PRD 9장), 내보내기 `scene-timeline.json`(PRD 11장).

## 검증 결과 (종단 스모크 테스트 — 전부 PASS)

| # | 검증 항목 | 결과 |
|---|-----------|------|
| 1 | 로그인 / 세션 쿠키 | ✅ |
| 2 | 스토리북 장면 집계 | ✅ 4 scenes |
| 3 | AI 합치기·요약 (스텁) | ✅ |
| 4 | 내레이션 upsert | ✅ |
| 5 | 승인 (빈 본문 POST) | ✅ |
| 6 | 공유 공개 열람 (승인 데이터만) | ✅ |
| 7 | RBAC — 업로더의 관리자 API 접근 | ✅ 403 차단 |
| 8 | 멀티파트 업로드 + Sharp 480/1280 | ✅ |
| 9 | 영상 ffprobe 길이 + 커버 프레임 | ✅ duration=3s |
| 10 | 미디어 스트리밍 인증 / 비인증 | ✅ 200 / 401 |
| 11 | 내보내기 패키지 생성 | ✅ project.json + scene-timeline.json + 미디어 |

빌드 게이트: `pnpm typecheck`(server+client) ✅ · `pnpm build`(client, CSS 24KB/JS 321KB) ✅ · `pnpm migrate`/`seed` ✅.

## 빌드 중 자가 수정 (Phase 5 성격)

1. **빈 본문 JSON 파서** — 본문 없는 POST(승인/로그아웃/무효화)가 415/400으로 실패 → 관대한 `application/json` 파서 추가.
2. **세션 쿠키 secure** — prod에서만 `Secure` 부여(로컬 http에서 쿠키 유실 방지).
3. **Sharp 파생 ENOENT** — 사진이 영상보다 먼저 처리될 때 `thumbnails/` 미생성 → 파생 전 `ensureDir` 보장.
4. **AI 스텁 길이 0 가드** — 미디어 없는 장면(target=0)에서 합본이 한 문장으로 붕괴 → `chars>0`일 때만 압축.

## 알려진 갭 (MVP 범위 내 의도적 컷 / 후속)

- 프로젝트 **대표 이미지 업로드** 미구현(필드는 존재, nullable). 후속 라우트로 추가 용이.
- 미디어 정렬 **드래그 재정렬** UI는 토글까지만(정렬 API는 존재, DnD는 후속).
- 초대/공유 링크 원본은 **발급 직후 1회만** 표시(해시만 저장 — 의도된 보안 동작).
- Phase 2 항목(이미지 생성·BGM·PDF·이메일·CI·다단계 백업)은 PRD 18장대로 범위 외.

## 다음 단계 제안

```bash
pnpm dev      # 로컬 구동 후 브라우저 검증 (관리자 01000000000/admin123)
```

- `AI_PROVIDER=anthropic` + 키 설정으로 실제 LLM 합치기 활성화
- `/code-review` 코드 리뷰 → `/audit` 보안·라이선스 감사
- 대표이미지 업로드 + 드래그 정렬 보강 후 Phase 2 진입
- 서버 복구 시 `.env`만 교체해 D:\projects 배포 (deployment-notes.md)
