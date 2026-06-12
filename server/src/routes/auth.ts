import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { changePasswordSchema, loginSchema, registerSchema } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { createSession, destroySession } from '../lib/session.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../lib/guards.js';

// brute force 방어용 라우트별 rate limit
const strictLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

export async function authRoutes(app: FastifyInstance) {
  app.get('/me', async (req) => ({ user: req.user }));

  app.post('/register', strictLimit, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, body.email))
      .limit(1);
    if (existing[0]) throw new HttpError(409, '이미 가입된 이메일입니다');
    const passwordHash = await hashPassword(body.password);
    const inserted = await db
      .insert(schema.users)
      .values({ name: body.name, email: body.email, passwordHash })
      .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email, isAdmin: schema.users.isAdmin });
    const u = inserted[0]!;
    await createSession(reply, u.id);
    return { user: { id: u.id, name: u.name, email: u.email, is_admin: u.isAdmin } };
  });

  app.post('/login', strictLimit, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, body.email))
      .limit(1);
    const u = rows[0];
    if (!u || u.status !== 'active' || !(await verifyPassword(body.password, u.passwordHash))) {
      throw new HttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다');
    }
    await createSession(reply, u.id);
    return { user: { id: u.id, name: u.name, email: u.email, is_admin: u.isAdmin } };
  });

  app.post('/logout', async (req, reply) => {
    await destroySession(req, reply);
    return { ok: true };
  });

  // 내 비밀번호 변경 (설정 페이지)
  app.post('/change-password', strictLimit, async (req) => {
    const u = requireAuth(req);
    const body = changePasswordSchema.parse(req.body);
    const row = (await db.select().from(schema.users).where(eq(schema.users.id, u.id)).limit(1))[0];
    if (!row || !(await verifyPassword(body.current_password, row.passwordHash))) {
      throw new HttpError(401, '현재 비밀번호가 올바르지 않습니다');
    }
    await db
      .update(schema.users)
      .set({ passwordHash: await hashPassword(body.new_password) })
      .where(eq(schema.users.id, u.id));
    return { ok: true };
  });

  // 임시: 첫 관리자 부트스트랩 (멤버가 0명일 때만 허용)
  app.post('/bootstrap-admin', strictLimit, async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const count = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
    if (count[0]) throw new HttpError(403, '이미 사용자가 존재합니다');
    const passwordHash = await hashPassword(body.password);
    const inserted = await db
      .insert(schema.users)
      .values({ name: body.name, email: body.email, passwordHash, isAdmin: true })
      .returning({ id: schema.users.id });
    await createSession(reply, inserted[0]!.id);
    return { ok: true };
  });

  app.get('/_authcheck', async (req) => {
    const u = requireAuth(req);
    return { user: u };
  });
}
