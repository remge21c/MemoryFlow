import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { createProjectSchema, updateProjectSchema } from '@memoryflow/shared';
import type { ProjectDTO } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
import { requireAdmin, requireAuth, requireMember, requireProjectAdmin } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { ensureStorybook, mediaToDTO, scheduleToDTO } from '../services/scene.js';
import { dayCount, dateForDay } from '../lib/date.js';
import { projectDir } from '../lib/storage.js';
import fs from 'node:fs';
import { absPath } from '../lib/storage.js';

function toDTO(p: typeof schema.projects.$inferSelect): ProjectDTO {
  return {
    id: p.id,
    name: p.name,
    org_name: p.orgName,
    description: p.description,
    cover_image_path: p.coverImagePath,
    start_date: p.startDate,
    end_date: p.endDate,
    status: p.status as ProjectDTO['status'],
    default_photo_seconds: p.defaultPhotoSeconds,
    created_by: p.createdBy,
    created_at: p.createdAt,
    day_count: dayCount(p.startDate, p.endDate),
  };
}

export async function projectRoutes(app: FastifyInstance) {
  // 목록 — 관리자: 전체 / 업로더: 합류한 것
  app.get('/', async (req) => {
    const u = requireAuth(req);
    if (u.is_admin) {
      const rows = await db
        .select()
        .from(schema.projects)
        .orderBy(desc(schema.projects.createdAt));
      return { projects: rows.map(toDTO) };
    }
    const memberRows = await db
      .select({ pid: schema.projectMembers.projectId })
      .from(schema.projectMembers)
      .where(and(eq(schema.projectMembers.userId, u.id), eq(schema.projectMembers.status, 'active')));
    const ids = memberRows.map((r) => r.pid);
    if (!ids.length) return { projects: [] };
    const rows = await db
      .select()
      .from(schema.projects)
      .where(inArray(schema.projects.id, ids))
      .orderBy(desc(schema.projects.createdAt));
    return { projects: rows.map(toDTO) };
  });

  // 생성 (관리자)
  app.post('/', async (req) => {
    const u = requireAdmin(req);
    const body = createProjectSchema.parse(req.body);
    const inserted = await db
      .insert(schema.projects)
      .values({
        name: body.name,
        orgName: body.org_name,
        description: body.description,
        startDate: body.start_date,
        endDate: body.end_date,
        defaultPhotoSeconds: body.default_photo_seconds,
        createdBy: u.id,
      })
      .returning();
    const p = inserted[0]!;
    await ensureStorybook(p.id);
    return { project: toDTO(p) };
  });

  // 상세 — project + days(파생) + 일정 그룹
  app.get('/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    await requireMember(req, id);
    const rows = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
    const p = rows[0];
    if (!p) throw new HttpError(404, '프로젝트를 찾을 수 없습니다');
    const scheds = await db
      .select()
      .from(schema.schedules)
      .where(eq(schema.schedules.projectId, id))
      .orderBy(asc(schema.schedules.dayIndex), asc(schema.schedules.sortOrder));
    const dc = dayCount(p.startDate, p.endDate);
    const days = Array.from({ length: dc }, (_, i) => {
      const dayIndex = i + 1;
      return {
        day_index: dayIndex,
        date: dateForDay(p.startDate, dayIndex),
        schedules: scheds.filter((s) => s.dayIndex === dayIndex).map(scheduleToDTO),
      };
    });
    const sb = await ensureStorybook(id);
    return { project: toDTO(p), days, storybook: sb };
  });

  // 피드 — 일정별 기여(미디어 묶음 + 글)를 한 번에 (업로더 메인 화면, 카톡 형태)
  app.get('/:id/feed', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const u = await requireMember(req, id);
    const p = (await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1))[0];
    if (!p) throw new HttpError(404, '프로젝트를 찾을 수 없습니다');

    const scheds = await db
      .select()
      .from(schema.schedules)
      .where(eq(schema.schedules.projectId, id))
      .orderBy(asc(schema.schedules.dayIndex), asc(schema.schedules.sortOrder));

    const contribs = await db
      .select({ c: schema.contributions, uploaderName: schema.users.name })
      .from(schema.contributions)
      .innerJoin(schema.users, eq(schema.contributions.uploaderId, schema.users.id))
      .where(eq(schema.contributions.projectId, id))
      .orderBy(asc(schema.contributions.scheduleId), asc(schema.contributions.sortOrder), asc(schema.contributions.createdAt));

    const cids = contribs.map((r) => r.c.id);
    const mediaRows = cids.length
      ? await db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.contributionId, cids))
          .orderBy(asc(schema.media.sortOrder), asc(schema.media.id))
      : [];

    const mediaByContrib = new Map<number, ReturnType<typeof mediaToDTO>[]>();
    for (const m of mediaRows) {
      const arr = mediaByContrib.get(m.contributionId) ?? [];
      arr.push(mediaToDTO(m));
      mediaByContrib.set(m.contributionId, arr);
    }

    const contribBySched = new Map<number, unknown[]>();
    for (const r of contribs) {
      const arr = contribBySched.get(r.c.scheduleId) ?? [];
      arr.push({
        id: r.c.id,
        uploader_id: r.c.uploaderId,
        uploader_name: r.uploaderName,
        is_mine: r.c.uploaderId === u.id,
        story_text: r.c.storyText ?? '',
        created_at: r.c.createdAt,
        media: mediaByContrib.get(r.c.id) ?? [],
      });
      contribBySched.set(r.c.scheduleId, arr);
    }

    const dc = dayCount(p.startDate, p.endDate);
    const days = Array.from({ length: dc }, (_, i) => {
      const dayIndex = i + 1;
      return {
        day_index: dayIndex,
        date: dateForDay(p.startDate, dayIndex),
        schedules: scheds
          .filter((s) => s.dayIndex === dayIndex)
          .map((s) => ({ ...scheduleToDTO(s), contributions: contribBySched.get(s.id) ?? [] })),
      };
    });

    return { project: toDTO(p), days };
  });

  // 수정 (관리자)
  app.patch('/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    await requireProjectAdmin(req, id);
    const body = updateProjectSchema.parse(req.body);
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.org_name !== undefined) patch.orgName = body.org_name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.status !== undefined) patch.status = body.status;
    if (body.default_photo_seconds !== undefined) patch.defaultPhotoSeconds = body.default_photo_seconds;
    if (Object.keys(patch).length) {
      await db.update(schema.projects).set(patch).where(eq(schema.projects.id, id));
    }
    const rows = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
    return { project: toDTO(rows[0]!) };
  });

  // 삭제 (관리자) — CASCADE + 파일 디렉터리 정리
  app.delete('/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    await requireProjectAdmin(req, id);
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
    try {
      fs.rmSync(absPath(projectDir(id).images.split('/uploads')[0]!), {
        recursive: true,
        force: true,
      });
    } catch {
      /* ignore */
    }
    return { ok: true };
  });
}
