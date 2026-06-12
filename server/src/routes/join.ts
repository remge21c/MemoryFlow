import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { joinSchema } from '@memoryflow/shared';
import type { TokenValidation } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { tokenHash } from '../lib/hash.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { createSession } from '../lib/session.js';
import { HttpError } from '../lib/errors.js';

interface TokenValidationResult extends TokenValidation {}

async function resolveInvite(token: string) {
  const rows = await db
    .select({
      invite: schema.invites,
      projectName: schema.projects.name,
    })
    .from(schema.invites)
    .innerJoin(schema.projects, eq(schema.invites.projectId, schema.projects.id))
    .where(eq(schema.invites.tokenHash, tokenHash(token)))
    .limit(1);
  return rows[0];
}

export async function joinRoutes(app: FastifyInstance) {
  // 토큰 검증 (S-02 진입) — 토큰 무차별 대입 방어
  app.get('/:token', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req): Promise<TokenValidationResult> => {
    const token = (req.params as { token: string }).token;
    const r = await resolveInvite(token);
    if (!r || !r.invite.isActive) return { valid: false, expired: false, project_name: '' };
    const expired = new Date(r.invite.expiresAt).getTime() < Date.now();
    return { valid: !expired, expired, project_name: r.projectName };
  });

  // 합류 (가입 또는 기존 계정 로그인 후 합류) — 비밀번호 brute force 방어
  app.post('/', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = joinSchema.parse(req.body);
    const r = await resolveInvite(body.token);
    if (!r || !r.invite.isActive) throw new HttpError(400, '유효하지 않은 초대 링크입니다');
    if (new Date(r.invite.expiresAt).getTime() < Date.now()) {
      throw new HttpError(410, '만료된 초대 링크입니다');
    }
    const projectId = r.invite.projectId;

    // 이메일로 기존 계정 조회
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, body.email))
      .limit(1);

    let userId: number;
    if (existing[0]) {
      const u = existing[0];
      if (!(await verifyPassword(body.password, u.passwordHash))) {
        throw new HttpError(401, '이미 가입된 이메일입니다. 비밀번호가 일치하지 않습니다');
      }
      userId = u.id;
    } else {
      const inserted = await db
        .insert(schema.users)
        .values({ name: body.name, email: body.email, passwordHash: await hashPassword(body.password) })
        .returning({ id: schema.users.id });
      userId = inserted[0]!.id;
    }

    // 멤버 합류 (중복이면 active로 복구)
    const member = await db
      .select()
      .from(schema.projectMembers)
      .where(and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)))
      .limit(1);
    if (member[0]) {
      if (member[0].status !== 'active') {
        await db
          .update(schema.projectMembers)
          .set({ status: 'active' })
          .where(eq(schema.projectMembers.id, member[0].id));
      }
    } else {
      await db.insert(schema.projectMembers).values({ projectId, userId });
    }

    await createSession(reply, userId);
    return { ok: true, project_id: projectId };
  });
}
