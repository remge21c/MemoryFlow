import type { FastifyInstance } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { setTempPasswordSchema } from '@memoryflow/shared';
import type { MemberDTO } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { requireProjectAdmin } from '../lib/guards.js';
import { hashPassword } from '../lib/password.js';
import { destroyUserSessions } from '../lib/session.js';

export async function memberRoutes(app: FastifyInstance) {
  app.get('/projects/:pid/members', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const rows = await db
      .select({
        member_id: schema.projectMembers.id,
        user_id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.projectMembers.role,
        status: schema.projectMembers.status,
        joined_at: schema.projectMembers.joinedAt,
      })
      .from(schema.projectMembers)
      .innerJoin(schema.users, eq(schema.projectMembers.userId, schema.users.id))
      .where(eq(schema.projectMembers.projectId, pid))
      .orderBy(asc(schema.projectMembers.joinedAt));
    return { members: rows as MemberDTO[] };
  });

  // 내보내기 (멤버십 removed)
  app.post('/projects/:pid/members/:uid/remove', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    const uid = Number((req.params as { uid: string }).uid);
    await requireProjectAdmin(req, pid);
    await db
      .update(schema.projectMembers)
      .set({ status: 'removed' })
      .where(and(eq(schema.projectMembers.projectId, pid), eq(schema.projectMembers.userId, uid)));
    return { ok: true };
  });

  app.post('/projects/:pid/members/:uid/restore', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    const uid = Number((req.params as { uid: string }).uid);
    await requireProjectAdmin(req, pid);
    await db
      .update(schema.projectMembers)
      .set({ status: 'active' })
      .where(and(eq(schema.projectMembers.projectId, pid), eq(schema.projectMembers.userId, uid)));
    return { ok: true };
  });

  // 임시 비밀번호 설정 (PRD 4장)
  app.post('/projects/:pid/members/:uid/temp-password', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    const uid = Number((req.params as { uid: string }).uid);
    await requireProjectAdmin(req, pid);
    const body = setTempPasswordSchema.parse(req.body);
    await db
      .update(schema.users)
      .set({ passwordHash: await hashPassword(body.password) })
      .where(eq(schema.users.id, uid));
    // 재설정된 계정의 기존 로그인 전부 무효화 — 임시 비밀번호로만 다시 접속 가능
    await destroyUserSessions(uid);
    return { ok: true };
  });
}
