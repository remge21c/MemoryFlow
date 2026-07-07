// 공유 열람 (비로그인, PRD 12장) — 승인된 공개 데이터만.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { tokenHash } from '../lib/hash.js';
import { HttpError } from '../lib/errors.js';
import { streamFile } from '../lib/stream.js';
import { buildScene } from '../services/scene.js';
import { dateForDay } from '../lib/date.js';

async function resolveShare(token: string) {
  const rows = await db
    .select()
    .from(schema.shareLinks)
    .where(eq(schema.shareLinks.tokenHash, tokenHash(token)))
    .limit(1);
  const link = rows[0];
  if (!link || !link.isActive) throw new HttpError(404, '유효하지 않은 링크입니다');
  if (new Date(link.expiresAt).getTime() < Date.now()) throw new HttpError(410, '만료된 링크입니다');
  // 승인된 스토리북만 공개
  const sb = (
    await db.select().from(schema.storybooks).where(eq(schema.storybooks.projectId, link.projectId)).limit(1)
  )[0];
  if (!sb || sb.status !== 'approved') throw new HttpError(403, '아직 공개되지 않았습니다');
  return { link, projectId: link.projectId };
}

async function assertSharedMedia(projectId: number, mediaId: number): Promise<string> {
  const r = await db
    .select({ filePath: schema.media.filePath, included: schema.media.included, projectId: schema.contributions.projectId })
    .from(schema.media)
    .innerJoin(schema.contributions, eq(schema.media.contributionId, schema.contributions.id))
    .where(eq(schema.media.id, mediaId))
    .limit(1);
  const m = r[0];
  if (!m || m.projectId !== projectId || !m.included) throw new HttpError(404, '공개되지 않은 미디어');
  return m.filePath;
}

export async function shareRoutes(app: FastifyInstance) {
  // 비로그인 공개 경로 — 토큰 무차별 대입 + 무거운 집계 반복 호출 방어
  app.get('/:token', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
    const token = (req.params as { token: string }).token;
    const { projectId } = await resolveShare(token);

    const project = (
      await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1)
    )[0]!;
    const scheds = await db
      .select()
      .from(schema.schedules)
      .where(eq(schema.schedules.projectId, projectId))
      .orderBy(asc(schema.schedules.dayIndex), asc(schema.schedules.sortOrder));

    const sceneByDay = new Map<number, unknown[]>();
    for (const s of scheds) {
      const scene = await buildScene(projectId, s.id, { onlyIncluded: true });
      if (!scene) continue;
      // 공개용으로 미디어 URL을 공유 토큰 경로로 치환
      const media = scene.media.map((m) => ({
        ...m,
        url: `/api/share/${token}/media/${m.id}`,
        thumb_url: m.thumb_url ? `/api/share/${token}/media/${m.id}?thumb=1` : null,
      }));
      const arr = sceneByDay.get(s.dayIndex) ?? [];
      arr.push({ schedule: scene.schedule, media, narration: scene.narration, scene_seconds: scene.scene_seconds });
      sceneByDay.set(s.dayIndex, arr);
    }

    const isSeq = project.scheduleType === 'sequence';
    // 실제 장면이 존재하는 day_index만으로 그룹 구성.
    // (날짜 범위로 생성하던 기존 방식은 sequence 프로젝트의 2번 이후 순번을 누락시켰음)
    const presentDays = [...new Set(scheds.map((s) => s.dayIndex))].sort((a, b) => a - b);
    const days = presentDays
      .map((di) => ({
        day_index: di,
        date: isSeq || di === 0 ? '' : dateForDay(project.startDate, di), // di 0 = 사전 준비(날짜 없음)
        scenes: sceneByDay.get(di) ?? [],
      }))
      .filter((d) => d.scenes.length > 0);

    const videos = await db
      .select()
      .from(schema.projectVideos)
      .where(and(eq(schema.projectVideos.projectId, projectId), eq(schema.projectVideos.status, 'published')))
      .orderBy(asc(schema.projectVideos.createdAt));

    return {
      project: {
        name: project.name,
        org_name: project.orgName,
        description: project.description,
        start_date: project.startDate,
        end_date: project.endDate,
        schedule_type: project.scheduleType,
      },
      days,
      videos: videos.map((v) => ({ id: v.id, url: `/api/share/${token}/video/${v.id}` })),
    };
  });

  app.get('/:token/media/:id', async (req: FastifyRequest, reply) => {
    const token = (req.params as { token: string }).token;
    const id = Number((req.params as { id: string }).id);
    const { projectId } = await resolveShare(token);
    const rel = await assertSharedMedia(projectId, id);
    // 썸네일 요청이면 thumb 경로
    const wantThumb = (req.query as { thumb?: string }).thumb;
    if (wantThumb) {
      const t = await db.select({ thumb: schema.media.thumbPath }).from(schema.media).where(eq(schema.media.id, id)).limit(1);
      if (t[0]?.thumb) return streamFile(req, reply, t[0].thumb);
    }
    return streamFile(req, reply, rel);
  });

  app.get('/:token/video/:id', async (req: FastifyRequest, reply) => {
    const token = (req.params as { token: string }).token;
    const id = Number((req.params as { id: string }).id);
    const { projectId } = await resolveShare(token);
    const v = await db
      .select()
      .from(schema.projectVideos)
      .where(eq(schema.projectVideos.id, id))
      .limit(1);
    if (!v[0] || v[0].projectId !== projectId || v[0].status !== 'published') {
      throw new HttpError(404, '공개되지 않은 영상');
    }
    return streamFile(req, reply, v[0].filePath);
  });
}
