import type { FastifyInstance } from 'fastify';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  aiMergeSchema,
  aiSummarizeSchema,
  updateMediaSchema,
  upsertNarrationSchema,
  sceneLength,
  targetChars,
  type SceneMediaItem,
} from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { requireProjectAdmin } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { buildScene, ensureStorybook } from '../services/scene.js';
import { mergeStories, summarizeToLength } from '../services/ai.js';

async function mediaProjectId(mediaId: number): Promise<{ projectId: number; scheduleId: number }> {
  const r = await db
    .select({ projectId: schema.contributions.projectId, scheduleId: schema.contributions.scheduleId })
    .from(schema.media)
    .innerJoin(schema.contributions, eq(schema.media.contributionId, schema.contributions.id))
    .where(eq(schema.media.id, mediaId))
    .limit(1);
  if (!r[0]) throw new HttpError(404, '미디어를 찾을 수 없습니다');
  return r[0];
}

export async function storybookRoutes(app: FastifyInstance) {
  // 스토리북 요약(장면 목록 + 길이/내레이션 상태)
  app.get('/projects/:pid/storybook', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const sb = await ensureStorybook(pid);
    const proj = (
      await db
        .select({ def: schema.projects.defaultPhotoSeconds })
        .from(schema.projects)
        .where(eq(schema.projects.id, pid))
        .limit(1)
    )[0];
    const def = proj?.def ?? 3;

    const scheds = await db
      .select()
      .from(schema.schedules)
      .where(eq(schema.schedules.projectId, pid))
      .orderBy(asc(schema.schedules.dayIndex), asc(schema.schedules.sortOrder));

    const schedIds = scheds.map((s) => s.id);
    const contribRows = schedIds.length
      ? await db
          .select({
            id: schema.contributions.id,
            scheduleId: schema.contributions.scheduleId,
            storyText: schema.contributions.storyText,
            uploaderName: schema.users.name,
          })
          .from(schema.contributions)
          .innerJoin(schema.users, eq(schema.contributions.uploaderId, schema.users.id))
          .where(inArray(schema.contributions.scheduleId, schedIds))
      : [];
    const contribToSched = new Map(contribRows.map((c) => [c.id, c.scheduleId]));
    const contribIds = contribRows.map((c) => c.id);
    const mediaRows = contribIds.length
      ? await db.select().from(schema.media).where(inArray(schema.media.contributionId, contribIds))
      : [];
    const narrationRows = await db
      .select()
      .from(schema.sceneNarrations)
      .where(eq(schema.sceneNarrations.storybookId, sb.id));
    const narrationBySched = new Map(narrationRows.map((n) => [n.scheduleId, n.narrationText ?? '']));

    const scenes = scheds.map((s) => {
      const photoSeconds = s.photoSeconds ?? def;
      const schedMedia = mediaRows
        .filter((m) => contribToSched.get(m.contributionId) === s.id);
      
      const items: SceneMediaItem[] = schedMedia
        .map((m) => ({ type: m.type as 'photo' | 'video', included: m.included, duration_seconds: m.durationSeconds }));
      
      const { scene_seconds, target_chars } = sceneLength(items, photoSeconds);
      const narration = narrationBySched.get(s.id) ?? '';
      
      const schedContribs = contribRows
        .filter((c) => c.scheduleId === s.id)
        .map((c) => ({
          uploader_name: c.uploaderName,
          story_text: c.storyText ?? '',
        }));

      return {
        schedule_id: s.id,
        day_index: s.dayIndex,
        title: s.title,
        time: s.time,
        media_count: items.length,
        scene_seconds,
        target_chars,
        has_narration: narration.trim().length > 0,
        narration_chars: narration.trim().length,
        narration,
        media: schedMedia.map((m) => ({
          id: m.id,
          type: m.type,
          url: `/api/media/${m.id}`,
          thumb_url: m.thumbPath ? `/api/media/${m.id}?thumb=1` : null,
          included: m.included,
        })),
        stories: schedContribs,
      };
    });

    return { storybook: sb, scenes, total_seconds: scenes.reduce((a, s) => a + s.scene_seconds, 0) };
  });

  // 단일 장면 편집 뷰
  app.get('/projects/:pid/storybook/scenes/:sid', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    const sid = Number((req.params as { sid: string }).sid);
    const u = await requireProjectAdmin(req, pid);
    const scene = await buildScene(pid, sid, { userId: u.id });
    if (!scene) throw new HttpError(404, '장면을 찾을 수 없습니다');
    const sb = await ensureStorybook(pid);
    return { scene, storybook: sb };
  });

  // 미디어 선별/정렬 토글
  app.patch('/storybook/media/:mid', async (req) => {
    const mid = Number((req.params as { mid: string }).mid);
    const { projectId } = await mediaProjectId(mid);
    await requireProjectAdmin(req, projectId);
    const body = updateMediaSchema.parse(req.body);
    const patch: Record<string, unknown> = {};
    if (body.included !== undefined) patch.included = body.included;
    if (body.sort_order !== undefined) patch.sortOrder = body.sort_order;
    if (Object.keys(patch).length) {
      await db.update(schema.media).set(patch).where(eq(schema.media.id, mid));
    }
    return { ok: true };
  });

  // 내레이션 upsert
  app.post('/projects/:pid/storybook/narration', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const body = upsertNarrationSchema.parse(req.body);
    const sb = await ensureStorybook(pid);
    await db
      .insert(schema.sceneNarrations)
      .values({ storybookId: sb.id, scheduleId: body.schedule_id, narrationText: body.narration_text })
      .onConflictDoUpdate({
        target: [schema.sceneNarrations.storybookId, schema.sceneNarrations.scheduleId],
        set: { narrationText: body.narration_text, updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))` },
      });
    return { ok: true };
  });

  // AI: 대본 초안 생성 (PRD 9장) — 초안만 반환, 적용은 클라이언트
  app.post('/projects/:pid/storybook/ai/merge', async (req, reply) => {
    const pid = Number((req.params as { pid: string }).pid);
    const u = await requireProjectAdmin(req, pid);
    const body = aiMergeSchema.parse(req.body);
    const scene = await buildScene(pid, body.schedule_id, { userId: u.id });
    if (!scene) throw new HttpError(404, '장면을 찾을 수 없습니다');
    const perspectives = scene.contributions.map((c) => ({ name: c.uploader_name, text: c.story_text ?? '' }));
    try {
      const draft = await mergeStories(perspectives, scene.scene_seconds, scene.schedule.title);
      return { draft, scene_seconds: scene.scene_seconds, target_chars: scene.target_chars };
    } catch (e) {
      const msg = (e as Error).message === 'AI_TIMEOUT' ? 'AI 응답이 지연됩니다. 잠시 후 다시 시도하세요' : 'AI 호출에 실패했습니다';
      return reply.status(503).send({ error: 'ai', message: msg });
    }
  });

  // AI: 모든 장면 대본 초안 일괄 생성 및 저장
  app.post('/projects/:pid/storybook/ai/merge-all', async (req, reply) => {
    const pid = Number((req.params as { pid: string }).pid);
    const u = await requireProjectAdmin(req, pid);
    const sb = await ensureStorybook(pid);
    if (sb.status === 'approved') throw new HttpError(400, '승인된 스토리북은 변경할 수 없습니다');

    const scheds = await db
      .select()
      .from(schema.schedules)
      .where(eq(schema.schedules.projectId, pid));

    try {
      const results = await Promise.all(
        scheds.map(async (s) => {
          const scene = await buildScene(pid, s.id, { userId: u.id });
          if (!scene) return { schedule_id: s.id, success: false };

          const perspectives = scene.contributions.map((c) => ({
            name: c.uploader_name,
            text: c.story_text ?? '',
          }));

          const draft = await mergeStories(perspectives, scene.scene_seconds, scene.schedule.title);

          await db
            .insert(schema.sceneNarrations)
            .values({
              storybookId: sb.id,
              scheduleId: s.id,
              narrationText: draft,
            })
            .onConflictDoUpdate({
              target: [schema.sceneNarrations.storybookId, schema.sceneNarrations.scheduleId],
              set: {
                narrationText: draft,
                updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
              },
            });

          return { schedule_id: s.id, success: true };
        })
      );

      return { ok: true, results };
    } catch (e) {
      const msg = (e as Error).message === 'AI_TIMEOUT' ? 'AI 응답이 지연됩니다. 잠시 후 다시 시도하세요' : 'AI 호출에 실패했습니다';
      return reply.status(503).send({ error: 'ai', message: msg });
    }
  });

  // AI: 길이에 맞게 요약
  app.post('/projects/:pid/storybook/ai/summarize', async (req, reply) => {
    const pid = Number((req.params as { pid: string }).pid);
    const u = await requireProjectAdmin(req, pid);
    const body = aiSummarizeSchema.parse(req.body);
    const scene = await buildScene(pid, body.schedule_id, { userId: u.id });
    if (!scene) throw new HttpError(404, '장면을 찾을 수 없습니다');
    try {
      const draft = await summarizeToLength(body.narration_text, scene.scene_seconds);
      return { draft, target_chars: targetChars(scene.scene_seconds) };
    } catch (e) {
      const msg = (e as Error).message === 'AI_TIMEOUT' ? 'AI 응답이 지연됩니다. 잠시 후 다시 시도하세요' : 'AI 호출에 실패했습니다';
      return reply.status(503).send({ error: 'ai', message: msg });
    }
  });

  // 편집 잠금 토글 (S-27)
  app.post('/projects/:pid/storybook/lock', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const body = (req.body ?? {}) as { locked?: boolean };
    const sb = await ensureStorybook(pid);
    if (sb.status === 'approved') throw new HttpError(409, '승인된 스토리북은 항상 잠금입니다');
    await db
      .update(schema.storybooks)
      .set({ isEditLocked: Boolean(body.locked) })
      .where(eq(schema.storybooks.id, sb.id));
    return { ok: true, is_edit_locked: Boolean(body.locked) };
  });

  // 승인 (전체 잠금)
  app.post('/projects/:pid/storybook/approve', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    const u = await requireProjectAdmin(req, pid);
    const sb = await ensureStorybook(pid);
    await db
      .update(schema.storybooks)
      .set({
        status: 'approved',
        isEditLocked: true,
        approvedAt: new Date().toISOString(),
        approvedBy: u.id,
      })
      .where(eq(schema.storybooks.id, sb.id));
    return { ok: true };
  });

  // 승인 해제 (관리자만)
  app.post('/projects/:pid/storybook/unapprove', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const sb = await ensureStorybook(pid);
    await db
      .update(schema.storybooks)
      .set({ status: 'draft', isEditLocked: false, approvedAt: null, approvedBy: null })
      .where(eq(schema.storybooks.id, sb.id));
    return { ok: true };
  });
}
