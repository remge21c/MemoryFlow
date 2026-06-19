import type { FastifyInstance } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { createScheduleSchema, insertScheduleSchema, updateScheduleSchema } from '@memoryflow/shared';
import { db, schema, sqlite } from '../db/client.js';
import { requireMember, requireProjectAdmin } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { scheduleToDTO } from '../services/scene.js';

async function scheduleProjectId(scheduleId: number): Promise<number> {
  const r = await db
    .select({ pid: schema.schedules.projectId })
    .from(schema.schedules)
    .where(eq(schema.schedules.id, scheduleId))
    .limit(1);
  if (!r[0]) throw new HttpError(404, '일정을 찾을 수 없습니다');
  return r[0].pid;
}

export async function scheduleRoutes(app: FastifyInstance) {
  app.get('/projects/:pid/schedules', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireMember(req, pid);
    const rows = await db
      .select()
      .from(schema.schedules)
      .where(eq(schema.schedules.projectId, pid))
      .orderBy(asc(schema.schedules.dayIndex), asc(schema.schedules.sortOrder));
    return { schedules: rows.map(scheduleToDTO) };
  });

  app.post('/projects/:pid/schedules', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const body = createScheduleSchema.parse(req.body);
    const inserted = await db
      .insert(schema.schedules)
      .values({
        projectId: pid,
        dayIndex: body.day_index,
        time: body.time,
        title: body.title,
        place: body.place,
        category: body.category,
        sortOrder: body.sort_order,
        photoSeconds: body.photo_seconds ?? null,
      })
      .returning();
    return { schedule: scheduleToDTO(inserted[0]!) };
  });

  app.patch('/schedules/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const pid = await scheduleProjectId(id);
    await requireProjectAdmin(req, pid);
    const body = updateScheduleSchema.parse(req.body);
    const patch: Record<string, unknown> = {};
    if (body.day_index !== undefined) patch.dayIndex = body.day_index;
    if (body.time !== undefined) patch.time = body.time;
    if (body.title !== undefined) patch.title = body.title;
    if (body.place !== undefined) patch.place = body.place;
    if (body.category !== undefined) patch.category = body.category;
    if (body.sort_order !== undefined) patch.sortOrder = body.sort_order;
    if (body.photo_seconds !== undefined) patch.photoSeconds = body.photo_seconds;
    if (Object.keys(patch).length) {
      await db.update(schema.schedules).set(patch).where(eq(schema.schedules.id, id));
    }
    const rows = await db.select().from(schema.schedules).where(eq(schema.schedules.id, id)).limit(1);
    return { schedule: scheduleToDTO(rows[0]!) };
  });

  app.delete('/schedules/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const pid = await scheduleProjectId(id);
    await requireProjectAdmin(req, pid);

    const proj = (await db.select({ type: schema.projects.scheduleType })
      .from(schema.projects).where(eq(schema.projects.id, pid)).limit(1))[0]!;
    const target = (await db.select().from(schema.schedules)
      .where(eq(schema.schedules.id, id)).limit(1))[0]!;

    if (proj.type === 'sequence') {
      sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM schedules WHERE id = ?').run(id);
        sqlite.prepare(
          'UPDATE schedules SET day_index = day_index - 1 WHERE project_id = ? AND day_index > ?'
        ).run(pid, target.dayIndex);
      })();
    } else {
      await db.delete(schema.schedules).where(eq(schema.schedules.id, id));
    }
    return { ok: true };
  });

  // 앞/뒤에 새 장면 삽입 (양 타입 공통) — 원자적 재번호 매기기
  app.post('/schedules/:id/insert-after', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const pid = await scheduleProjectId(id);
    await requireProjectAdmin(req, pid);
    const body = insertScheduleSchema.parse(req.body);

    const proj = (await db.select({ type: schema.projects.scheduleType })
      .from(schema.projects).where(eq(schema.projects.id, pid)).limit(1))[0]!;
    const target = (await db.select().from(schema.schedules)
      .where(eq(schema.schedules.id, id)).limit(1))[0]!;

    const inserted = sqlite.transaction(() => {
      if (proj.type === 'sequence') {
        sqlite.prepare(
          'UPDATE schedules SET day_index = day_index + 1 WHERE project_id = ? AND day_index > ?'
        ).run(pid, target.dayIndex);
        return sqlite.prepare(
          'INSERT INTO schedules (project_id, day_index, title, time, place, category, sort_order, photo_seconds) VALUES (?, ?, ?, ?, ?, ?, 0, ?) RETURNING *'
        ).get(pid, target.dayIndex + 1, body.title, body.time || null, body.place || null, body.category || null, body.photo_seconds ?? null);
      } else {
        sqlite.prepare(
          'UPDATE schedules SET sort_order = sort_order + 1 WHERE project_id = ? AND day_index = ? AND sort_order > ?'
        ).run(pid, target.dayIndex, target.sortOrder);
        return sqlite.prepare(
          'INSERT INTO schedules (project_id, day_index, title, time, place, category, sort_order, photo_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *'
        ).get(pid, target.dayIndex, body.title, body.time || null, body.place || null, body.category || null, target.sortOrder + 1, body.photo_seconds ?? null);
      }
    })();

    return { schedule: scheduleToDTO(inserted as typeof schema.schedules.$inferSelect) };
  });

  app.post('/schedules/:id/insert-before', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const pid = await scheduleProjectId(id);
    await requireProjectAdmin(req, pid);
    const body = insertScheduleSchema.parse(req.body);

    const proj = (await db.select({ type: schema.projects.scheduleType })
      .from(schema.projects).where(eq(schema.projects.id, pid)).limit(1))[0]!;
    const target = (await db.select().from(schema.schedules)
      .where(eq(schema.schedules.id, id)).limit(1))[0]!;

    const inserted = sqlite.transaction(() => {
      if (proj.type === 'sequence') {
        sqlite.prepare(
          'UPDATE schedules SET day_index = day_index + 1 WHERE project_id = ? AND day_index >= ?'
        ).run(pid, target.dayIndex);
        return sqlite.prepare(
          'INSERT INTO schedules (project_id, day_index, title, time, place, category, sort_order, photo_seconds) VALUES (?, ?, ?, ?, ?, ?, 0, ?) RETURNING *'
        ).get(pid, target.dayIndex, body.title, body.time || null, body.place || null, body.category || null, body.photo_seconds ?? null);
      } else {
        sqlite.prepare(
          'UPDATE schedules SET sort_order = sort_order + 1 WHERE project_id = ? AND day_index = ? AND sort_order >= ?'
        ).run(pid, target.dayIndex, target.sortOrder);
        return sqlite.prepare(
          'INSERT INTO schedules (project_id, day_index, title, time, place, category, sort_order, photo_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *'
        ).get(pid, target.dayIndex, body.title, body.time || null, body.place || null, body.category || null, target.sortOrder, body.photo_seconds ?? null);
      }
    })();

    return { schedule: scheduleToDTO(inserted as typeof schema.schedules.$inferSelect) };
  });
}
