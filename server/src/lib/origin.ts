// 허용 Origin 판정 — CORS와 CSRF(Origin/Referer 검증)에서 공용으로 사용.
import { env } from '../env.js';

// 개발: localhost / 127.0.0.1 의 임의 포트만 허용 (vite 5173/5174 등)
const DEV_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** origin 문자열이 허용 목록에 속하는가. (Origin 헤더가 없으면 false) */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  if (env.isProd) return env.CORS_ORIGINS.includes(origin);
  return DEV_ORIGIN_RE.test(origin);
}
