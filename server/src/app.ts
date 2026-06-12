import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { env } from './env.js';
import { migrate } from './db/migrate.js';
import { loadUser } from './lib/session.js';
import { HttpError } from './lib/errors.js';

import { authRoutes } from './routes/auth.js';
import { joinRoutes } from './routes/join.js';
import { projectRoutes } from './routes/projects.js';
import { scheduleRoutes } from './routes/schedules.js';
import { memberRoutes } from './routes/members.js';
import { inviteRoutes } from './routes/invites.js';
import { contributionRoutes } from './routes/contributions.js';
import { mediaRoutes } from './routes/media.js';
import { storybookRoutes } from './routes/storybook.js';
import { shareLinkRoutes } from './routes/shareLinks.js';
import { shareRoutes } from './routes/share.js';
import { videoRoutes } from './routes/videos.js';
import { exportRoutes } from './routes/export.js';

export async function buildApp() {
  migrate();

  const app = Fastify({
    logger: true,
    bodyLimit: 50 * 1024 * 1024,
  });

  await app.register(cors, {
    // 개발: vite dev 서버 등 모든 origin 허용. 프로덕션: CORS_ORIGIN 목록만 (미설정 시 동일 출처만).
    origin: env.isProd ? (env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false) : true,
    credentials: true,
  });
  await app.register(cookie, { secret: env.SESSION_SECRET });

  // 라우트별 opt-in rate limit (로그인/가입/초대합류/공유열람 등 비인증·민감 경로)
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'rate_limited',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
    }),
  });

  // 빈 본문 JSON 허용 (본문 없는 POST: 승인/로그아웃/무효화 등)
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const s = body as string;
    if (!s || s.trim().length === 0) return done(null, {});
    try {
      done(null, JSON.parse(s));
    } catch (err) {
      (err as { statusCode?: number }).statusCode = 400;
      done(err as Error, undefined);
    }
  });
  await app.register(multipart, {
    limits: { fileSize: 1024 * 1024 * 1024, files: 30 },
  });

  // 모든 요청에 세션 사용자 부착
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (req) => {
    req.user = await loadUser(req);
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: 'validation',
        message: err.errors[0]?.message ?? '입력값을 확인해주세요',
        issues: err.errors,
      });
    }
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ error: 'http', message: err.message });
    }
    if ((err as { statusCode?: number }).statusCode === 413) {
      return reply.status(413).send({ error: 'too_large', message: '파일이 너무 큽니다' });
    }
    if ((err as { statusCode?: number }).statusCode === 429) {
      return reply
        .status(429)
        .send({ error: 'rate_limited', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' });
    }
    reply.log.error(err);
    return reply.status(500).send({ error: 'internal', message: '서버 오류' });
  });

  app.get('/api/health', async () => ({ ok: true, ts: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(joinRoutes, { prefix: '/api/join' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(scheduleRoutes, { prefix: '/api' });
  await app.register(memberRoutes, { prefix: '/api' });
  await app.register(inviteRoutes, { prefix: '/api' });
  await app.register(contributionRoutes, { prefix: '/api' });
  await app.register(mediaRoutes, { prefix: '/api' });
  await app.register(storybookRoutes, { prefix: '/api' });
  await app.register(shareLinkRoutes, { prefix: '/api' });
  await app.register(shareRoutes, { prefix: '/api/share' });
  await app.register(videoRoutes, { prefix: '/api' });
  await app.register(exportRoutes, { prefix: '/api' });

  return app;
}
