import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { createShareLinkSchema } from '@memoryflow/shared';
import type { ShareLinkDTO } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { requireAdmin, requireProjectAdmin } from '../lib/guards.js';
import { generateToken, tokenHash } from '../lib/hash.js';
import { HttpError } from '../lib/errors.js';

export async function shareLinkRoutes(app: FastifyInstance) {
  app.get('/projects/:pid/share-links', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const rows = await db
      .select()
      .from(schema.shareLinks)
      .where(eq(schema.shareLinks.projectId, pid))
      .orderBy(desc(schema.shareLinks.createdAt));
    return {
      share_links: rows.map((r) => ({
        id: r.id,
        is_active: r.isActive,
        expires_at: r.expiresAt,
        created_at: r.createdAt,
        url: r.token ? `/share/${r.token}` : '', // 토큰 보관분만 재열람 가능
      })) as ShareLinkDTO[],
    };
  });

  app.post('/projects/:pid/share-links', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const body = createShareLinkSchema.parse(req.body);
    const raw = generateToken();
    const expiresAt = new Date(Date.now() + body.expires_days * 86_400_000).toISOString();
    const inserted = await db
      .insert(schema.shareLinks)
      .values({ projectId: pid, tokenHash: tokenHash(raw), token: raw, expiresAt })
      .returning();
    const r = inserted[0]!;
    return {
      share_link: {
        id: r.id,
        is_active: r.isActive,
        expires_at: r.expiresAt,
        created_at: r.createdAt,
        url: `/share/${raw}`, // 원본 1회 노출
      } as ShareLinkDTO,
    };
  });

  app.post('/share-links/:id/deactivate', async (req) => {
    requireAdmin(req); // 존재 여부 노출 전에 인증 먼저
    const id = Number((req.params as { id: string }).id);
    const r = await db.select().from(schema.shareLinks).where(eq(schema.shareLinks.id, id)).limit(1);
    if (!r[0]) throw new HttpError(404, '공유 링크를 찾을 수 없습니다');
    await requireProjectAdmin(req, r[0].projectId);
    await db.update(schema.shareLinks).set({ isActive: false }).where(eq(schema.shareLinks.id, id));
    return { ok: true };
  });
}
