// 미디어 파생 생성 (PRD 10장) — Sharp(이미지) + ffmpeg(영상), 로컬 처리.
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { env } from '../env.js';
import { absPath, ensureDir, projectDir } from '../lib/storage.js';

if (env.FFMPEG_PATH) ffmpeg.setFfmpegPath(env.FFMPEG_PATH);
if (env.FFPROBE_PATH) ffmpeg.setFfprobePath(env.FFPROBE_PATH);

// ffmpeg 비용 방어: 벽시계 타임아웃 + 동시 처리 제한(CPU 고갈 방지)
const FFMPEG_ENCODE_TIMEOUT_MS = 5 * 60_000; // 재인코딩(자르기)
const FFMPEG_SHOT_TIMEOUT_MS = 60_000; // 커버 프레임 추출
const MAX_CONCURRENT_FFMPEG = 2;

let activeFfmpeg = 0;
const ffmpegWaiters: Array<() => void> = [];

/** 동시 ffmpeg 작업을 MAX_CONCURRENT_FFMPEG개로 제한. */
async function withFfmpegSlot<T>(fn: () => Promise<T>): Promise<T> {
  while (activeFfmpeg >= MAX_CONCURRENT_FFMPEG) {
    await new Promise<void>((r) => ffmpegWaiters.push(r));
  }
  activeFfmpeg++;
  try {
    return await fn();
  } finally {
    activeFfmpeg--;
    ffmpegWaiters.shift()?.();
  }
}


export interface ImageDerivatives {
  thumbPath: string; // 480
  previewPath: string; // 1280
}

/** 원본 이미지 → 480 썸네일 + 1280 미리보기. 실패해도 원본은 유지(파생만 null). */
export async function makeImageDerivatives(
  projectId: number,
  relImagePath: string,
  baseName: string,
): Promise<ImageDerivatives | null> {
  try {
    const dir = projectDir(projectId).thumbnails;
    ensureDir(dir);
    const thumbRel = path.posix.join(dir, `${baseName}_480.jpg`);
    const previewRel = path.posix.join(dir, `${baseName}_1280.jpg`);
    const srcAbs = absPath(relImagePath);
    await sharp(srcAbs)
      .rotate()
      .resize({ width: 480, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(absPath(thumbRel));
    await sharp(srcAbs)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toFile(absPath(previewRel));
    return { thumbPath: thumbRel, previewPath: previewRel };
  } catch {
    return null;
  }
}

export interface VideoDerivatives {
  durationSeconds: number | null;
  thumbPath: string | null;
}

/** 영상 → 길이(초) + 1초 지점 커버 프레임. (PRD 8·10장) */
export async function makeVideoDerivatives(
  projectId: number,
  relVideoPath: string,
  baseName: string,
): Promise<VideoDerivatives> {
  const srcAbs = absPath(relVideoPath);
  const dir = projectDir(projectId).thumbnails;
  ensureDir(dir);
  const thumbRel = path.posix.join(dir, `${baseName}_cover.jpg`);

  const durationSeconds = await probeDuration(srcAbs).catch(() => null);

  const thumbPath = await withFfmpegSlot(
    () =>
      new Promise<string | null>((resolve) => {
        const cmd = ffmpeg(srcAbs);
        const timer = setTimeout(() => {
          try { cmd.kill('SIGKILL'); } catch { /* noop */ }
          resolve(null);
        }, FFMPEG_SHOT_TIMEOUT_MS);
        cmd
          .on('end', () => { clearTimeout(timer); resolve(thumbRel); })
          .on('error', () => { clearTimeout(timer); resolve(null); })
          .screenshots({
            timestamps: ['1'],
            filename: `${baseName}_cover.jpg`,
            folder: absPath(dir),
            size: '1280x?',
          });
      }),
  );

  return { durationSeconds, thumbPath };
}

function probeDuration(absSrc: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(absSrc, (err, data) => {
      if (err) return reject(err);
      const d = data.format?.duration;
      resolve(typeof d === 'number' ? Math.round(d * 100) / 100 : null);
    });
  });
}

export interface TrimResult {
  relPath: string;
  durationSeconds: number | null;
  thumbPath: string | null;
}

/** 영상 구간 자르기 — 프레임 정확도를 위해 재인코딩(libx264/aac). 새 파일을 만들어 반환. */
export async function trimVideo(
  projectId: number,
  relVideoPath: string,
  startSec: number,
  endSec: number,
): Promise<TrimResult> {
  const dirs = projectDir(projectId);
  ensureDir(dirs.videos);
  const baseName = nanoid(16);
  const outRel = path.posix.join(dirs.videos, `${baseName}.mp4`);

  await withFfmpegSlot(
    () =>
      new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg(absPath(relVideoPath))
          .setStartTime(startSec)
          .setDuration(endSec - startSec)
          .outputOptions(['-c:v libx264', '-preset veryfast', '-crf 23', '-c:a aac', '-movflags +faststart']);
        const timer = setTimeout(() => {
          try { cmd.kill('SIGKILL'); } catch { /* noop */ }
          reject(new Error('영상 처리 시간이 초과되었습니다'));
        }, FFMPEG_ENCODE_TIMEOUT_MS);
        cmd
          .on('end', () => { clearTimeout(timer); resolve(); })
          .on('error', (e) => { clearTimeout(timer); reject(e); })
          .save(absPath(outRel));
      }),
  );

  const d = await makeVideoDerivatives(projectId, outRel, baseName);
  return { relPath: outRel, durationSeconds: d.durationSeconds, thumbPath: d.thumbPath };
}

export function detectType(mimetype: string, filename: string): 'photo' | 'video' {
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('image/')) return 'photo';
  return /\.(mp4|mov|webm|avi|mkv)$/i.test(filename) ? 'video' : 'photo';
}
