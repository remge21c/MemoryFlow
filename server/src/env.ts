import 'dotenv/config';
import path from 'node:path';

const root = process.cwd();

function resolve(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(root, p);
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  STORAGE_ROOT: resolve(process.env.STORAGE_ROOT ?? './storage'),
  DB_PATH: resolve(process.env.DB_PATH ?? './data/db/memoryflow.sqlite'),
  SESSION_SECRET:
    process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me-please-32c',
  AI_PROVIDER: (process.env.AI_PROVIDER ?? 'stub') as 'stub' | 'anthropic' | 'gemini',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  AI_MODEL: process.env.AI_MODEL ?? 'claude-opus-4-8',
  FFMPEG_PATH: process.env.FFMPEG_PATH ?? '',
  FFPROBE_PATH: process.env.FFPROBE_PATH ?? '',
  isProd: process.env.NODE_ENV === 'production',
};
