import type { FastifyInstance } from 'fastify';
import { and, asc, eq, ne } from 'drizzle-orm';
import { createScheduleSchema, insertScheduleSchema, updateScheduleSchema } from '@memoryflow/shared';
import { db, schema, sqlite } from '../db/client.js';
import { requireMember, requireProjectAdmin } from '../lib/guards.js';
import { HttpError } from '../lib/errors.js';
import { scheduleToDTO } from '../services/scene.js';

// "HH:MM" → 분 단위. 파싱 불가하면 null(정렬 비교에서 제외, 시간 없는 장면 취급)
function parseMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

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

  // 이미 순서가 꼬여 있는 기존 장면들을 한 번에 시간순으로 재정렬(Day별로 독립).
  // 시간이 없는 장면은 상대 순서를 유지한 채 맨 뒤로 보낸다.
  app.post('/projects/:pid/schedules/resort-by-time', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);

    const rows = await db
      .select()
      .from(schema.schedules)
      .where(eq(schema.schedules.projectId, pid))
      .orderBy(asc(schema.schedules.dayIndex), asc(schema.schedules.sortOrder));

    const byDay = new Map<number, typeof rows>();
    for (const r of rows) {
      const arr = byDay.get(r.dayIndex) ?? [];
      arr.push(r);
      byDay.set(r.dayIndex, arr);
    }

    sqlite.transaction(() => {
      for (const arr of byDay.values()) {
        const sorted = arr
          .map((r, i) => ({ r, i, key: parseMinutes(r.time) ?? Infinity }))
          .sort((a, b) => a.key - b.key || a.i - b.i)
          .map((x) => x.r);
        sorted.forEach((r, idx) => {
          if (r.sortOrder !== idx) {
            sqlite.prepare('UPDATE schedules SET sort_order = ? WHERE id = ?').run(idx, r.id);
          }
        });
      }
    })();

    return { ok: true };
  });

  app.post('/projects/:pid/schedules', async (req) => {
    const pid = Number((req.params as { pid: string }).pid);
    await requireProjectAdmin(req, pid);
    const body = createScheduleSchema.parse(req.body);

    // 같은 Day 안에서 시간(time) 기준 자동 삽입 위치 계산.
    // 시간이 있으면 더 늦은 시간을 가진 첫 장면 앞에 끼워 넣고, 시간 없는 장면은 건너뛴다(그대로 둔다).
    // 시간이 없으면 기존처럼 맨 뒤에 추가.
    const siblings = await db
      .select({ id: schema.schedules.id, sortOrder: schema.schedules.sortOrder, time: schema.schedules.time })
      .from(schema.schedules)
      .where(and(eq(schema.schedules.projectId, pid), eq(schema.schedules.dayIndex, body.day_index)))
      .orderBy(asc(schema.schedules.sortOrder));

    const newMin = parseMinutes(body.time);
    let insertAt = siblings.length;
    if (newMin !== null) {
      const idx = siblings.findIndex((s) => {
        const m = parseMinutes(s.time);
        return m !== null && m > newMin;
      });
      if (idx !== -1) insertAt = idx;
    }

    const inserted = sqlite.transaction(() => {
      for (let i = siblings.length - 1; i >= insertAt; i--) {
        sqlite.prepare('UPDATE schedules SET sort_order = ? WHERE id = ?').run(i + 1, siblings[i]!.id);
      }
      return sqlite.prepare(
        'INSERT INTO schedules (project_id, day_index, title, time, place, category, sort_order, photo_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *'
      ).get(pid, body.day_index, body.title, body.time || null, body.place || null, body.category || null, insertAt, body.photo_seconds ?? null);
    })();

    return { schedule: scheduleToDTO(inserted as typeof schema.schedules.$inferSelect) };
  });

  app.patch('/schedules/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const pid = await scheduleProjectId(id);
    await requireProjectAdmin(req, pid);
    const body = updateScheduleSchema.parse(req.body);
    const current = (await db.select().from(schema.schedules).where(eq(schema.schedules.id, id)).limit(1))[0]!;

    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.place !== undefined) patch.place = body.place;
    if (body.category !== undefined) patch.category = body.category;
    if (body.photo_seconds !== undefined) patch.photoSeconds = body.photo_seconds;

    // day_index/sort_order를 명시적으로 보낸 경우(수동 삽입 등)는 그대로 존중.
    // time만 바뀐 경우엔 같은 Day 안에서 새 시간에 맞는 위치로 자동 재배치.
    const dayIndex = body.day_index ?? current.dayIndex;
    const timeChanged = body.time !== undefined && (body.time || null) !== current.time;
    const manualPosition = body.sort_order !== undefined || body.day_index !== undefined;

    if ((timeChanged || body.day_index !== undefined) && !manualPosition) {
      const siblings = await db
        .select({ id: schema.schedules.id, sortOrder: schema.schedules.sortOrder, time: schema.schedules.time })
        .from(schema.schedules)
        .where(and(eq(schema.schedules.projectId, pid), eq(schema.schedules.dayIndex, dayIndex), ne(schema.schedules.id, id)))
        .orderBy(asc(schema.schedules.sortOrder));

      const newTime = body.time !== undefined ? body.time : current.time;
      const newMin = parseMinutes(newTime);
      let insertAt = siblings.length;
      if (newMin !== null) {
        const idx = siblings.findIndex((s) => {
          const m = parseMinutes(s.time);
          return m !== null && m > newMin;
        });
        if (idx !== -1) insertAt = idx;
      }

      sqlite.transaction(() => {
        for (let i = siblings.length - 1; i >= insertAt; i--) {
          sqlite.prepare('UPDATE schedules SET sort_order = ? WHERE id = ?').run(i + 1, siblings[i]!.id);
        }
        sqlite.prepare('UPDATE schedules SET day_index = ?, sort_order = ? WHERE id = ?').run(dayIndex, insertAt, id);
      })();
    } else if (body.day_index !== undefined) {
      patch.dayIndex = body.day_index;
    }
    if (body.time !== undefined) patch.time = body.time || null;
    if (manualPosition && body.sort_order !== undefined) patch.sortOrder = body.sort_order;

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
