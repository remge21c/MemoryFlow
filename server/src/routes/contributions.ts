import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { assertNotLocked, isProjectLocked, requireAuth, requireMember } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { buildScene } from '../services/scene.js';
import { addMediaToContribution, type UploadedFile } from '../services/upload.js';

async function collectMultipart(req: import('fastify').FastifyRequest) {
  const fields: Record<string, string> = {};
  const files: UploadedFile[] = [];
  for await (const part of req.parts()) {
    if (part.type === 'file') {
      const buffer = await part.toBuffer();
      files.push({ filename: part.filename, mimetype: part.mimetype, buffer });
    } else {
      fields[part.fieldname] = String(part.value);
    }
  }
  return { fields, files };
}

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

    const { fields, files } = await collectMultipart(req);
    const storyText = (fields.story_text ?? '').trim();
    if (!storyText && files.length === 0) {
      throw new HttpError(400, '스토리 또는 사진/영상을 하나 이상 입력하세요');
    }

    const inserted = await db
      .insert(schema.contributions)
      .values({ projectId: pid, scheduleId: sid, uploaderId: u.id, storyText })
      .returning({ id: schema.contributions.id });
    const contributionId = inserted[0]!.id;

    if (files.length) await addMediaToContribution(pid, contributionId, files);

    const scene = await buildScene(pid, sid, { userId: u.id });
    return { scene, contribution_id: contributionId };
  });

  // 기여 스토리 수정 (소유자, 미잠금)
  app.patch('/contributions/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = requireAuth(req);
    const c = await contributionContext(id);
    if (c.uploaderId !== u.id && !u.is_admin) throw new HttpError(403, '본인 기여만 수정할 수 있습니다');
    assertNotLocked(await isProjectLocked(c.projectId));
    const body = (req.body ?? {}) as { story_text?: string };
    await db
      .update(schema.contributions)
      .set({ storyText: (body.story_text ?? '').trim(), updatedAt: new Date().toISOString() })
      .where(eq(schema.contributions.id, id));
    const scene = await buildScene(c.projectId, c.scheduleId, { userId: u.id });
    return { scene };
  });

  // 기여에 미디어 추가
  app.post('/contributions/:id/media', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = requireAuth(req);
    const c = await contributionContext(id);
    if (c.uploaderId !== u.id && !u.is_admin) throw new HttpError(403, '본인 기여만 수정할 수 있습니다');
    assertNotLocked(await isProjectLocked(c.projectId));
    const { files } = await collectMultipart(req);
    if (files.length) await addMediaToContribution(c.projectId, id, files);
    const scene = await buildScene(c.projectId, c.scheduleId, { userId: u.id });
    return { scene };
  });

  // 기여 삭제 (소유자, 미잠금)
  app.delete('/contributions/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = requireAuth(req);
    const c = await contributionContext(id);
    if (c.uploaderId !== u.id && !u.is_admin) throw new HttpError(403, '본인 기여만 삭제할 수 있습니다');
    assertNotLocked(await isProjectLocked(c.projectId));
    await db.delete(schema.contributions).where(eq(schema.contributions.id, id));
    return { ok: true };
  });
}
