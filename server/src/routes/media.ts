import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { trimMediaSchema } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { assertNotLocked, isProjectLocked, requireAuth, requireMember } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { streamFile } from '../lib/stream.js';
import { removeFile } from '../lib/storage.js';
import { trimVideo } from '../services/media.js';

async function mediaContext(mediaId: number) {
  const r = await db
    .select({
      media: schema.media,
      projectId: schema.contributions.projectId,
      scheduleId: schema.contributions.scheduleId,
      uploaderId: schema.contributions.uploaderId,
    })
    .from(schema.media)
    .innerJoin(schema.contributions, eq(schema.media.contributionId, schema.contributions.id))
    .where(eq(schema.media.id, mediaId))
    .limit(1);
  if (!r[0]) throw new HttpError(404, '미디어를 찾을 수 없습니다');
  return r[0];
}

export async function mediaRoutes(app: FastifyInstance) {
  // 스트리밍 (세션 권한 검증, Range 지원)
  app.get('/media/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const ctx = await mediaContext(id);
    await requireMember(req, ctx.projectId);
    const thumb = (req.query as { thumb?: string }).thumb;
    const rel = thumb && ctx.media.thumbPath ? ctx.media.thumbPath : ctx.media.filePath;
    return streamFile(req, reply, rel);
  });

  // 영상 구간 자르기 (소유자/관리자, 미잠금) — 원본 보관 없이 교체, 재인코딩이라 수십 초 걸릴 수 있음
  app.post('/media/:id/trim', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = requireAuth(req);
    const ctx = await mediaContext(id);
    if (ctx.uploaderId !== u.id && !u.is_admin) throw new HttpError(403, '본인 미디어만 자를 수 있습니다');
    if (!u.is_admin) assertNotLocked(await isProjectLocked(ctx.projectId));
    if (ctx.media.type !== 'video') throw new HttpError(400, '영상만 자를 수 있습니다');

    const body = trimMediaSchema.parse(req.body);
    const dur = ctx.media.durationSeconds;
    if (dur != null && body.end_seconds > dur + 0.5) {
      throw new HttpError(400, '구간이 영상 길이를 벗어났습니다');
    }

    let result;
    try {
      result = await trimVideo(ctx.projectId, ctx.media.filePath, body.start_seconds, body.end_seconds);
    } catch (e) {
      req.log.error(e, '[trim] ffmpeg 실패');
      throw new HttpError(500, '영상 처리에 실패했습니다. 잠시 후 다시 시도해주세요');
    }

    await db
      .update(schema.media)
      .set({
        filePath: result.relPath,
        durationSeconds: result.durationSeconds,
        thumbPath: result.thumbPath,
      })
      .where(eq(schema.media.id, id));

    // 원본 교체 — 기존 파일/썸네일 삭제
    removeFile(ctx.media.filePath);
    removeFile(ctx.media.thumbPath);

    return { ok: true, duration_seconds: result.durationSeconds };
  });

  // 삭제 (소유자, 미잠금)
  app.delete('/media/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = requireAuth(req);
    const ctx = await mediaContext(id);
    if (ctx.uploaderId !== u.id && !u.is_admin) throw new HttpError(403, '본인 미디어만 삭제할 수 있습니다');
    if (!u.is_admin) assertNotLocked(await isProjectLocked(ctx.projectId));
    await db.delete(schema.media).where(eq(schema.media.id, id));
    removeFile(ctx.media.filePath);
    removeFile(ctx.media.thumbPath);
    removeFile(ctx.media.previewPath);
    return { ok: true };
  });
}
