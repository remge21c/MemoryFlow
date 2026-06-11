// 파일 스토리지 — STORAGE_ROOT 기준. DB엔 상대경로만 저장. (deployment-notes.md 2장)
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../env.js';

export function projectDir(projectId: number) {
  return {
    images: path.posix.join('projects', String(projectId), 'uploads', 'images'),
    videos: path.posix.join('projects', String(projectId), 'uploads', 'videos'),
    thumbnails: path.posix.join('projects', String(projectId), 'thumbnails'),
    outputs: path.posix.join('projects', String(projectId), 'outputs'),
    finalVideos: path.posix.join('projects', String(projectId), 'final-videos'),
    bgm: path.posix.join('projects', String(projectId), 'bgm'),
  };
}

/** STORAGE_ROOT 기준 상대경로 → 절대경로. 경로 탈출 방지. */
export function absPath(relPath: string): string {
  const abs = path.resolve(env.STORAGE_ROOT, relPath);
  const root = path.resolve(env.STORAGE_ROOT);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error('storage path escape');
  }
  return abs;
}

export function ensureDir(relDir: string): void {
  fs.mkdirSync(absPath(relDir), { recursive: true });
}

export function saveBuffer(relPath: string, buf: Buffer): void {
  const abs = absPath(relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buf);
}

export function fileExists(relPath: string): boolean {
  try {
    return fs.existsSync(absPath(relPath));
  } catch {
    return false;
  }
}

export function statFile(relPath: string): fs.Stats {
  return fs.statSync(absPath(relPath));
}

export function removeFile(relPath: string | null | undefined): void {
  if (!relPath) return;
  try {
    fs.rmSync(absPath(relPath), { force: true });
  } catch {
    /* ignore */
  }
}

export function writeJson(relPath: string, data: unknown): void {
  saveBuffer(relPath, Buffer.from(JSON.stringify(data, null, 2), 'utf8'));
}
