import type { FastifyInstance } from 'fastify';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { asc, eq } from 'drizzle-orm';
import { updateVideoStatusSchema } from '@memoryflow/shared';
import type { VideoDTO } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { requireMember, requireProjectAdmin } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { projectDir, removeFile, saveBuffer } from '../lib/storage.js';
import { streamFile } from '../lib/stream.js';

function toDTO(v: typeof schema.projectVideos.$inferSelect): VideoDTO {
  return {
    id: v.id,
    project_id: v.projectId,
    file_path: v.filePath,
    status: v.status as VideoDTO['status'],
    created_at: v.createdAt,
    url: `/api/videos/${v.id}`,
  };
}

async function videoCtx(id: number) {
  const r = await db.select().from(schema.projectVideos).where(eq(schema.projectVideos.id, id)).limit(1);
  if (!r[0]) throw new HttpError(404, '영상을 찾을 수 없습니다');
  return r[0];
}

export async function videoRoutes(app: FastifyInstance) {
  app.get('/projects/:pid/videos', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireMember(req, pid);
    const rows = await db
      .select()
      .from(schema.projectVideos)
      .where(eq(schema.projectVideos.projectId, pid))
      .orderBy(asc(schema.projectVideos.createdAt));
    return { videos: rows.map(toDTO) };
  });

  // 최종 영상 업로드 (관리자)
  app.post('/projects/:pid/videos', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const file = await req.file();
    if (!file) throw new HttpError(400, '영상 파일이 필요합니다');
    const buffer = await file.toBuffer();
    const ext = path.extname(file.filename) || '.mp4';
    const rel = path.posix.join(projectDir(pid).finalVideos, `${nanoid(16)}${ext}`);
    saveBuffer(rel, buffer);
    const inserted = await db
      .insert(schema.projectVideos)
      .values({ projectId: pid, filePath: rel })
      .returning();
    return { video: toDTO(inserted[0]!) };
  });

  // 상태 변경 (uploaded/published/hidden)
  app.patch('/videos/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const v = await videoCtx(id);
    await requireProjectAdmin(req, v.projectId);
    const body = updateVideoStatusSchema.parse(req.body);
    await db.update(schema.projectVideos).set({ status: body.status }).where(eq(schema.projectVideos.id, id));
    return { ok: true };
  });

  app.delete('/videos/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const v = await videoCtx(id);
    await requireProjectAdmin(req, v.projectId);
    await db.delete(schema.projectVideos).where(eq(schema.projectVideos.id, id));
    removeFile(v.filePath);
    return { ok: true };
  });

  // 스트리밍 (로그인 멤버, Range)
  app.get('/videos/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const v = await videoCtx(id);
    await requireMember(req, v.projectId);
    return streamFile(req, reply, v.filePath);
  });
}
