// 업로드 처리 — multipart를 메모리 버퍼 없이 디스크로 직접 스트리밍. (PRD 6·8·10장)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { once } from 'node:events';
import type { Readable } from 'node:stream';
import type { FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { nanoid } from 'nanoid';
import { fileTypeFromFile } from 'file-type';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { absPath, ensureDir, projectDir, removeFile } from '../lib/storage.js';
import { HttpError } from '../lib/errors.js';
import { makeImageDerivatives, makeVideoDerivatives } from './media.js';

// 허용 파일 형식 화이트리스트 + 타입별 크기 제한
const PHOTO_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi']);
const PHOTO_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const VIDEO_MAX_BYTES = 300 * 1024 * 1024; // 300MB (업로더 기여 영상 per-file 한도)

export interface SavedUpload {
  type: 'photo' | 'video';
  relPath: string;
  baseName: string;
  hash: string;
}

export interface CollectedUpload {
  fields: Record<string, string>;
  files: SavedUpload[];
}

type MediaKind = 'photo' | 'video' | 'audio';

/**
 * 저장된 파일의 실제 매직넘버가 기대 카테고리와 일치하는지 검증.
 * 확장자/MIME은 위조 가능하므로 콘텐츠 시그니처로 최종 확인한다.
 * 불일치·미탐지면 파일 삭제 후 415.
 */
async function assertActualContent(relPath: string, expected: MediaKind): Promise<void> {
  const ft = await fileTypeFromFile(absPath(relPath)).catch(() => undefined);
  const ext = ft ? `.${ft.ext}` : null;
  const detected: MediaKind | null = !ext
    ? null
    : PHOTO_EXT.has(ext)
      ? 'photo'
      : VIDEO_EXT.has(ext)
        ? 'video'
        : AUDIO_EXTENSIONS.has(ext)
          ? 'audio'
          : null;
  if (detected !== expected) {
    removeFile(relPath);
    throw new HttpError(415, '파일 내용이 형식과 일치하지 않습니다');
  }
}

function resolveKind(mimetype: string, filename: string): { type: 'photo' | 'video'; ext: string } | null {
  const ext = path.extname(filename).toLowerCase();
  if (mimetype.startsWith('image/')) return { type: 'photo', ext: PHOTO_EXT.has(ext) ? ext : '.jpg' };
  if (mimetype.startsWith('video/')) return { type: 'video', ext: VIDEO_EXT.has(ext) ? ext : '.mp4' };
  if (PHOTO_EXT.has(ext)) return { type: 'photo', ext };
  if (VIDEO_EXT.has(ext)) return { type: 'video', ext };
  return null;
}

/** 스트림 → 파일 저장(+sha256). 크기 초과 시 부분 파일 삭제 후 413. */
async function streamToFile(file: Readable, absTarget: string, maxBytes: number): Promise<string> {
  const hash = crypto.createHash('sha256');
  let size = 0;
  const ws = fs.createWriteStream(absTarget);
  try {
    for await (const chunk of file as AsyncIterable<Buffer>) {
      size += chunk.length;
      if (size > maxBytes) throw new HttpError(413, '파일이 너무 큽니다');
      hash.update(chunk);
      if (!ws.write(chunk)) await once(ws, 'drain');
    }
    ws.end();
    await once(ws, 'finish');
  } catch (e) {
    ws.destroy();
    fs.rmSync(absTarget, { force: true });
    throw e;
  }
  return hash.digest('hex');
}

/**
 * multipart 요청 수집 — 파일은 프로젝트 스토리지에 즉시 스트리밍 저장.
 * 형식 화이트리스트/크기 제한 위반 시 저장된 파일을 정리하고 413/415.
 */
export async function collectMultipartUpload(req: FastifyRequest, projectId: number): Promise<CollectedUpload> {
  const fields: Record<string, string> = {};
  const files: SavedUpload[] = [];
  const dirs = projectDir(projectId);
  ensureDir(dirs.images);
  ensureDir(dirs.videos);
  try {
    for await (const part of req.parts()) {
      if (part.type !== 'file') {
        fields[part.fieldname] = String(part.value);
        continue;
      }
      const kind = resolveKind(part.mimetype, part.filename);
      if (!kind) throw new HttpError(415, `허용되지 않는 파일 형식입니다: ${part.filename}`);
      const maxBytes = kind.type === 'video' ? VIDEO_MAX_BYTES : PHOTO_MAX_BYTES;
      const baseName = nanoid(16);
      const relPath = path.posix.join(kind.type === 'video' ? dirs.videos : dirs.images, `${baseName}${kind.ext}`);
      const hash = await streamToFile(part.file, absPath(relPath), maxBytes);
      if (part.file.truncated) {
        // multipart 전역 fileSize 한도 도달 — 잘린 파일 폐기
        removeFile(relPath);
        throw new HttpError(413, '파일이 너무 큽니다');
      }
      await assertActualContent(relPath, kind.type); // 매직넘버 검증(불일치 시 삭제+415)
      files.push({ type: kind.type, relPath, baseName, hash });
    }
  } catch (e) {
    for (const f of files) removeFile(f.relPath);
    throw e;
  }
  return { fields, files };
}

export const VIDEO_EXTENSIONS = VIDEO_EXT;
export const IMAGE_EXTENSIONS = PHOTO_EXT;
export const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.ogg']);

/** 단일 multipart 파일을 화이트리스트/크기 제한 검증 후 스트리밍 저장. 상대경로 반환. */
export async function saveUploadedFile(
  part: MultipartFile,
  relDir: string,
  opts: { allowedExt: Set<string>; maxBytes: number; kind: MediaKind },
): Promise<string> {
  const ext = path.extname(part.filename).toLowerCase();
  if (!opts.allowedExt.has(ext)) {
    throw new HttpError(415, `허용되지 않는 파일 형식입니다: ${part.filename}`);
  }
  ensureDir(relDir);
  const relPath = path.posix.join(relDir, `${nanoid(16)}${ext}`);
  await streamToFile(part.file, absPath(relPath), opts.maxBytes);
  if (part.file.truncated) {
    removeFile(relPath);
    throw new HttpError(413, '파일이 너무 큽니다');
  }
  await assertActualContent(relPath, opts.kind); // 매직넘버 검증
  return relPath;
}

/** 저장된 업로드 파일들을 검증 실패 등으로 폐기. */
export function discardUploads(files: SavedUpload[]): void {
  for (const f of files) removeFile(f.relPath);
}

/** 저장 완료된 업로드를 기여에 첨부(media 행 생성) + 파생 생성. */
export async function addMediaToContribution(
  projectId: number,
  contributionId: number,
  files: SavedUpload[],
): Promise<number[]> {
  const ids: number[] = [];
  let order = 0;
  for (const f of files) {
    const inserted = await db
      .insert(schema.media)
      .values({
        contributionId,
        type: f.type,
        filePath: f.relPath,
        fileHash: f.hash,
        sortOrder: order++,
      })
      .returning({ id: schema.media.id });
    const mediaId = inserted[0]!.id;
    ids.push(mediaId);

    // 파생 (실패해도 원본/행은 유지)
    if (f.type === 'photo') {
      const d = await makeImageDerivatives(projectId, f.relPath, f.baseName);
      if (d) {
        await db
          .update(schema.media)
          .set({ thumbPath: d.thumbPath, previewPath: d.previewPath })
          .where(eq(schema.media.id, mediaId));
      }
    } else {
      const d = await makeVideoDerivatives(projectId, f.relPath, f.baseName);
      await db
        .update(schema.media)
        .set({ durationSeconds: d.durationSeconds, thumbPath: d.thumbPath })
        .where(eq(schema.media.id, mediaId));
    }
  }
  return ids;
}
