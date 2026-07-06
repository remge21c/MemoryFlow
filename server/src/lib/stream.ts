// 권한 검증 후 파일 스트리밍 + HTTP Range (PRD 13장).
import fs from 'node:fs';
import path from 'node:path';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { absPath } from './storage.js';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  // 오디오(BGM) — 없으면 octet-stream으로 나가 브라우저가 재생을 거부함
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

export function contentType(relPath: string): string {
  return MIME[path.extname(relPath).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * 파일 스트리밍. async 핸들러에서 `return streamFile(...)` 하도록 항상 reply를 반환한다
 * (reply.send 후 undefined를 반환하면 Fastify가 빈 본문으로 덮어쓰는 문제 방지).
 */
export function streamFile(req: FastifyRequest, reply: FastifyReply, relPath: string): FastifyReply {
  const abs = absPath(relPath);
  let size: number;
  try {
    size = fs.statSync(abs).size;
  } catch {
    return reply.status(404).send({ error: 'not_found', message: '파일이 없습니다' });
  }
  const type = contentType(relPath);
  const range = req.headers.range;

  reply.header('Accept-Ranges', 'bytes');
  reply.header('Cache-Control', 'private, max-age=3600');

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : size - 1;
      const safeEnd = Math.min(end, size - 1);
      if (start > safeEnd) {
        return reply.status(416).header('Content-Range', `bytes */${size}`).send();
      }
      return reply
        .status(206)
        .header('Content-Range', `bytes ${start}-${safeEnd}/${size}`)
        .header('Content-Length', safeEnd - start + 1)
        .type(type)
        .send(fs.createReadStream(abs, { start, end: safeEnd }));
    }
  }

  return reply.header('Content-Length', size).type(type).send(fs.createReadStream(abs));
}
