import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { requireProjectAdmin } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { buildExportManifest } from '../services/export.js';

export async function exportRoutes(app: FastifyInstance) {
  // 영상 제작용 패키지 매니페스트 (승인된 스토리북, PRD 11장)
  // 서버에 패키지를 저장하지 않음 — 클라이언트가 받아서 로컬 폴더에 직접 기록.
  app.get('/projects/:pid/export/manifest', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const sb = (
      await db.select().from(schema.storybooks).where(eq(schema.storybooks.projectId, pid)).limit(1)
    )[0];
    if (!sb || sb.status !== 'approved') {
      throw new HttpError(409, '승인된 스토리북만 내보낼 수 있습니다');
    }
    return buildExportManifest(pid);
  });
}
