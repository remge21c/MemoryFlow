// CSRF 방어 — 상태변경(POST/PATCH/DELETE) 요청의 Origin(없으면 Referer)이
// 허용 출처(allowlist) 또는 요청 자신의 호스트(same-origin)와 일치하는지 검증.
// SameSite=lax 쿠키와 이중 방어. 이 API는 브라우저 SPA에서만 호출되므로 정상 요청은 항상 통과한다.
// same-host 허용 덕분에 프로덕션에서 CORS_ORIGIN 미설정이어도 동일 출처 요청은 막지 않는다.
import type { FastifyRequest } from 'fastify';
import { isAllowedOrigin } from './origin.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isCsrfSafe(req: FastifyRequest): boolean {
  if (SAFE_METHODS.has(req.method)) return true;

  const host = req.headers.host;
  // origin 문자열이 allowlist에 있거나, 요청 자신의 host와 같으면 통과
  const ok = (originStr: string): boolean => {
    if (isAllowedOrigin(originStr)) return true;
    try {
      return !!host && new URL(originStr).host === host;
    } catch {
      return false;
    }
  };

  const origin = req.headers.origin;
  if (origin) return ok(origin);

  // Origin이 없으면(일부 동일 출처 요청) Referer의 출처로 폴백
  const referer = req.headers.referer;
  if (referer) {
    try {
      return ok(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  // 상태변경 요청인데 Origin/Referer가 모두 없으면 거부
  return false;
}
