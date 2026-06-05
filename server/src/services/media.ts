// 미디어 파생 생성 (PRD 10장) — Sharp(이미지) + ffmpeg(영상), 로컬 처리.
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { env } from '../env.js';
import { absPath, ensureDir, projectDir } from '../lib/storage.js';

if (env.FFMPEG_PATH) ffmpeg.setFfmpegPath(env.FFMPEG_PATH);
if (env.FFPROBE_PATH) ffmpeg.setFfprobePath(env.FFPROBE_PATH);

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

  const thumbPath = await new Promise<string | null>((resolve) => {
    ffmpeg(srcAbs)
      .on('end', () => resolve(thumbRel))
      .on('error', () => resolve(null))
      .screenshots({
        timestamps: ['1'],
        filename: `${baseName}_cover.jpg`,
        folder: absPath(dir),
        size: '1280x?',
      });
  });

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

export function detectType(mimetype: string, filename: string): 'photo' | 'video' {
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('image/')) return 'photo';
  return /\.(mp4|mov|webm|avi|mkv)$/i.test(filename) ? 'video' : 'photo';
}
