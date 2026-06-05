import type { FastifyInstance } from 'fastify';
import { and, asc, eq } from 'drizzle-orm';
import { createScheduleSchema, updateScheduleSchema } from '@memoryflow/shared';
import { db, schema } from '../db/client.js';
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
    await db.delete(schema.schedules).where(eq(schema.schedules.id, id));
    return { ok: true };
  });
}
