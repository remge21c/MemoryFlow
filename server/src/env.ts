import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const root = process.cwd();

function resolve(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(root, p);
}

const isProd = process.env.NODE_ENV === 'production';

// 프로덕션에서는 SESSION_SECRET 미설정 시 기동 자체를 막는다 (insecure 기본값 차단)
const sessionSecret = process.env.SESSION_SECRET;
if (isProd && (!sessionSecret || sessionSecret.length < 32)) {
  throw new Error('SESSION_SECRET 환경변수(32자 이상)가 필요합니다 (production)');
}
// .env.example 예시 기본값이면: 프로덕션 기동 차단 + 개발은 경고 (길이는 충분해도 공개된 값이라 위험)
const EXAMPLE_SESSION_SECRET = 'change-me-please-32chars-minimum-secret';
if (sessionSecret === EXAMPLE_SESSION_SECRET) {
  if (isProd) {
    throw new Error('SESSION_SECRET이 .env.example 기본값입니다. 32자 이상 랜덤 값으로 교체하세요 (예: openssl rand -base64 48)');
  }
  console.warn('[env] ⚠ SESSION_SECRET이 .env.example 공개 기본값입니다. 로컬 개발 외에는 반드시 랜덤 값으로 교체하세요.');
}

// 프로덕션에서 DB_PATH 미설정 시 기동을 막는다.
// (미설정 시 시스템 디스크의 임시 DB(./data/db)로 조용히 폴백 → 재배포 때 데이터/공유링크가 유실됨)
const dbPathEnv = process.env.DB_PATH;
if (isProd && !dbPathEnv) {
  throw new Error('DB_PATH 환경변수가 필요합니다 (production) — 미설정 시 임시 디스크로 폴백되어 데이터가 유실됩니다');
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  STORAGE_ROOT: resolve(process.env.STORAGE_ROOT ?? './storage'),
  DB_PATH: resolve(process.env.DB_PATH ?? './data/db/memoryflow.sqlite'),
  SESSION_SECRET: sessionSecret ?? 'dev-insecure-secret-change-me-please-32c',
  /** 허용 CORS origin 목록 (쉼표 구분). 프로덕션에서 비어 있으면 cross-origin 차단(동일 출처만). */
  CORS_ORIGINS: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  AI_PROVIDER: (process.env.AI_PROVIDER ?? 'stub') as 'stub' | 'anthropic' | 'gemini' | 'lmstudio',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  AI_MODEL: process.env.AI_MODEL ?? 'claude-opus-4-8',
  /** LM Studio (OpenAI 호환 로컬 서버) — 1차 제공자 실패 시 폴백으로도 사용 */
  LMSTUDIO_BASE_URL: process.env.LMSTUDIO_BASE_URL ?? 'http://localhost:1234/v1',
  /** 비우면 LM Studio에 로드된 모델을 자동 사용 */
  LMSTUDIO_MODEL: process.env.LMSTUDIO_MODEL ?? '',
  FFMPEG_PATH: process.env.FFMPEG_PATH ?? '',
  FFPROBE_PATH: process.env.FFPROBE_PATH ?? '',
  isProd,
};
