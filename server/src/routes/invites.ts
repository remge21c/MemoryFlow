import type { FastifyInstance } from 'fastify';
import { and, desc, eq } from 'drizzle-orm';
import { createInviteSchema } from '@memoryflow/shared';
import type { InviteDTO } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { requireProjectAdmin } from '../lib/guards.js';
import { generateToken, tokenHash } from '../lib/hash.js';
import { HttpError } from '../lib/errors.js';

export async function inviteRoutes(app: FastifyInstance) {
  app.get('/projects/:pid/invites', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const rows = await db
      .select()
      .from(schema.invites)
      .where(eq(schema.invites.projectId, pid))
      .orderBy(desc(schema.invites.createdAt));
    return {
      invites: rows.map((r) => ({
        id: r.id,
        is_active: r.isActive,
        expires_at: r.expiresAt,
        created_at: r.createdAt,
        url: r.token ? `/join/${r.token}` : '', // 토큰 보관분만 재열람 가능
      })) as InviteDTO[],
    };
  });

  app.post('/projects/:pid/invites', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    const u = await requireProjectAdmin(req, pid);
    const body = createInviteSchema.parse(req.body);
    const raw = generateToken();
    const expiresAt = new Date(Date.now() + body.expires_days * 86_400_000).toISOString();
    const inserted = await db
      .insert(schema.invites)
      .values({ projectId: pid, tokenHash: tokenHash(raw), token: raw, expiresAt, createdBy: u.id })
      .returning();
    const r = inserted[0]!;
    return {
      invite: {
        id: r.id,
        is_active: r.isActive,
        expires_at: r.expiresAt,
        created_at: r.createdAt,
        url: `/join/${raw}`, // 원본은 이번 응답에서 1회만
      } as InviteDTO,
    };
  });

  app.post('/invites/:id/deactivate', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const r = await db.select().from(schema.invites).where(eq(schema.invites.id, id)).limit(1);
    if (!r[0]) throw new HttpError(404, '초대 링크를 찾을 수 없습니다');
    await requireProjectAdmin(req, r[0].projectId);
    await db.update(schema.invites).set({ isActive: false }).where(eq(schema.invites.id, id));
    return { ok: true };
  });

  app.delete('/invites/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const r = await db.select().from(schema.invites).where(eq(schema.invites.id, id)).limit(1);
    if (!r[0]) throw new HttpError(404, '초대 링크를 찾을 수 없습니다');
    await requireProjectAdmin(req, r[0].projectId);
    await db.delete(schema.invites).where(eq(schema.invites.id, id));
    return { ok: true };
  });
}
