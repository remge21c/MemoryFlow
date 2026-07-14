import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, gt, ne } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { generateToken } from './hash.js';
import { env } from '../env.js';
import type { SessionUser } from '@memoryflow/shared';

export const SESSION_COOKIE = 'mf_session';
const SESSION_DAYS = 30;

function plusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export async function createSession(reply: FastifyReply, userId: number): Promise<void> {
  const id = generateToken();
  await db.insert(schema.sessions).values({
    id,
    userId,
    expiresAt: plusDays(SESSION_DAYS),
  });
  reply.setCookie(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: env.isProd,
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const id = req.cookies[SESSION_COOKIE];
  if (id) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  }
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** 해당 사용자의 세션 전부 삭제(keepSessionId만 유지). 비밀번호 변경/재설정 시 기존 로그인 무효화용. */
export async function destroyUserSessions(userId: number, keepSessionId?: string): Promise<void> {
  if (keepSessionId) {
    await db
      .delete(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), ne(schema.sessions.id, keepSessionId)));
  } else {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  }
}

/** 쿠키 → 사용자. 없거나 만료면 null. */
export async function loadUser(req: FastifyRequest): Promise<SessionUser | null> {
  const id = req.cookies[SESSION_COOKIE];
  if (!id) return null;
  const rows = await db
    .select({
      uid: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      isAdmin: schema.users.isAdmin,
      status: schema.users.status,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date().toISOString())))
    .limit(1);
  const r = rows[0];
  if (!r || r.status !== 'active') return null;
  return { id: r.uid, name: r.name, email: r.email, is_admin: r.isAdmin };
}
