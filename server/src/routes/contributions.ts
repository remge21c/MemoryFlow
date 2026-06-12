import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { assertNotLocked, isProjectLocked, requireAuth, requireMember } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { buildScene } from '../services/scene.js';
import { addMediaToContribution, collectMultipartUpload, discardUploads } from '../services/upload.js';
import { removeFile } from '../lib/storage.js';

async function contributionContext(contributionId: number) {
  const r = await db
    .select()
    .from(schema.contributions)
    .where(eq(schema.contributions.id, contributionId))
    .limit(1);
  if (!r[0]) throw new HttpError(404, '기여를 찾을 수 없습니다');
  return r[0];
}

export async function contributionRoutes(app: FastifyInstance) {
  // 장면의 기여 조회(타인 미디어도 보임 — 중복 보여주기, PRD 6장)
  app.get('/projects/:pid/schedules/:sid/scene', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    const sid = Number((req.params as { sid: string }).sid);
    const u = await requireMember(req, pid);
    const scene = await buildScene(pid, sid, { userId: u.id });
    if (!scene) throw new HttpError(404, '일정을 찾을 수 없습니다');
    const locked = await isProjectLocked(pid);
    return { scene, locked };
  });

  // 기여 생성 (사진/영상 + 스토리 동시, S-12 / T-4)
  app.post('/projects/:pid/schedules/:sid/contributions', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    const sid = Number((req.params as { sid: string }).sid);
    const u = await requireMember(req, pid);
    assertNotLocked(await isProjectLocked(pid));

    const sched = (
      await db
        .select({ id: schema.schedules.id })
        .from(schema.schedules)
        .where(and(eq(schema.schedules.id, sid), eq(schema.schedules.projectId, pid)))
        .limit(1)
    )[0];
    if (!sched) throw new HttpError(404, '일정을 찾을 수 없습니다');

    const { fields, files } = await collectMultipartUpload(req, pid);
    const storyText = (fields.story_text ?? '').trim();
    if (!storyText && files.length === 0) {
      throw new HttpError(400, '스토리 또는 사진/영상을 하나 이상 입력하세요');
    }

    let contributionId: number;
    try {
      const inserted = await db
        .insert(schema.contributions)
        .values({ projectId: pid, scheduleId: sid, uploaderId: u.id, storyText })
        .returning({ id: schema.contributions.id });
      contributionId = inserted[0]!.id;
      if (files.length) await addMediaToContribution(pid, contributionId, files);
    } catch (e) {
      discardUploads(files);
      throw e;
    }

    const scene = await buildScene(pid, sid, { userId: u.id });
    return { scene, contribution_id: contributionId };
  });

  // 기여 스토리 수정 (소유자, 미잠금)
  app.patch('/contributions/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = requireAuth(req);
    const c = await contributionContext(id);
    if (c.uploaderId !== u.id && !u.is_admin) throw new HttpError(403, '본인 기여만 수정할 수 있습니다');
    if (!u.is_admin) assertNotLocked(await isProjectLocked(c.projectId));
    const body = (req.body ?? {}) as { story_text?: string; schedule_id?: number };
    
    const patch: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (body.story_text !== undefined) {
      patch.storyText = body.story_text.trim();
    }
    if (body.schedule_id !== undefined) {
      const targetSched = (
        await db
          .select()
          .from(schema.schedules)
          .where(and(eq(schema.schedules.id, body.schedule_id), eq(schema.schedules.projectId, c.projectId)))
          .limit(1)
      )[0];
      if (!targetSched) {
        throw new HttpError(400, '올바르지 않은 일정입니다');
      }
      patch.scheduleId = body.schedule_id;
    }

    await db
      .update(schema.contributions)
      .set(patch)
      .where(eq(schema.contributions.id, id));

    const scene = await buildScene(c.projectId, patch.scheduleId ?? c.scheduleId, { userId: u.id });
    return { scene };
  });

  // 기여에 미디어 추가
  app.post('/contributions/:id/media', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = requireAuth(req);
    const c = await contributionContext(id);
    if (c.uploaderId !== u.id && !u.is_admin) throw new HttpError(403, '본인 기여만 수정할 수 있습니다');
    if (!u.is_admin) assertNotLocked(await isProjectLocked(c.projectId));
    const { files } = await collectMultipartUpload(req, c.projectId);
    try {
      if (files.length) await addMediaToContribution(c.projectId, id, files);
    } catch (e) {
      discardUploads(files);
      throw e;
    }
    const scene = await buildScene(c.projectId, c.scheduleId, { userId: u.id });
    return { scene };
  });

  // 기여 삭제 (소유자, 미잠금) — 첨부 미디어 행/파일도 함께 정리 (FK: media → contributions)
  app.delete('/contributions/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = requireAuth(req);
    const c = await contributionContext(id);
    if (c.uploaderId !== u.id && !u.is_admin) throw new HttpError(403, '본인 기여만 삭제할 수 있습니다');
    if (!u.is_admin) assertNotLocked(await isProjectLocked(c.projectId));
    const mediaRows = await db
      .select({
        filePath: schema.media.filePath,
        thumbPath: schema.media.thumbPath,
        previewPath: schema.media.previewPath,
      })
      .from(schema.media)
      .where(eq(schema.media.contributionId, id));
    await db.delete(schema.media).where(eq(schema.media.contributionId, id));
    await db.delete(schema.contributions).where(eq(schema.contributions.id, id));
    for (const m of mediaRows) {
      removeFile(m.filePath);
      removeFile(m.thumbPath);
      removeFile(m.previewPath);
    }
    return { ok: true };
  });
}
