// 장면 단위 집계 (가상 리소스 storybook_scene / share_storybook).
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { sceneLength, type SceneMediaItem } from '@memoryflow/shared';
import type {
  ContributionDTO,
  MediaDTO,
  SceneDTO,
  ScheduleDTO,
  StorybookDTO,
} from '@memoryflow/shared';

export function mediaToDTO(m: typeof schema.media.$inferSelect): MediaDTO {
  return {
    id: m.id,
    contribution_id: m.contributionId,
    type: m.type as 'photo' | 'video',
    file_path: m.filePath,
    duration_seconds: m.durationSeconds,
    included: m.included,
    sort_order: m.sortOrder,
    url: `/api/media/${m.id}`,
    thumb_url: m.thumbPath ? `/api/media/${m.id}?thumb=1` : null,
  };
}

export function scheduleToDTO(s: typeof schema.schedules.$inferSelect): ScheduleDTO {
  return {
    id: s.id,
    project_id: s.projectId,
    day_index: s.dayIndex,
    time: s.time,
    title: s.title,
    place: s.place,
    category: s.category,
    sort_order: s.sortOrder,
    photo_seconds: s.photoSeconds,
  };
}

/** 프로젝트의 스토리북을 보장(없으면 draft 생성). */
export async function ensureStorybook(projectId: number): Promise<StorybookDTO> {
  const found = await db
    .select()
    .from(schema.storybooks)
    .where(eq(schema.storybooks.projectId, projectId))
    .limit(1);
  let row = found[0];
  if (!row) {
    await db.insert(schema.storybooks).values({ projectId }).onConflictDoNothing();
    const again = await db
      .select()
      .from(schema.storybooks)
      .where(eq(schema.storybooks.projectId, projectId))
      .limit(1);
    row = again[0]!;
  }
  return {
    id: row.id,
    project_id: row.projectId,
    status: row.status as 'draft' | 'approved',
    is_edit_locked: row.isEditLocked,
    approved_at: row.approvedAt,
  };
}

async function narrationFor(storybookId: number, scheduleId: number): Promise<string> {
  const n = await db
    .select({ text: schema.sceneNarrations.narrationText })
    .from(schema.sceneNarrations)
    .where(
      and(
        eq(schema.sceneNarrations.storybookId, storybookId),
        eq(schema.sceneNarrations.scheduleId, scheduleId),
      ),
    )
    .limit(1);
  return n[0]?.text ?? '';
}

/** 한 장면의 전체 편집 뷰. onlyIncluded=true면 공유 열람용(선별된 미디어만). */
export async function buildScene(
  projectId: number,
  scheduleId: number,
  opts: { userId?: number; onlyIncluded?: boolean } = {},
): Promise<SceneDTO | null> {
  const sched = await db
    .select()
    .from(schema.schedules)
    .where(and(eq(schema.schedules.id, scheduleId), eq(schema.schedules.projectId, projectId)))
    .limit(1);
  const schedule = sched[0];
  if (!schedule) return null;

  const proj = await db
    .select({ def: schema.projects.defaultPhotoSeconds })
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);
  const photoSeconds = schedule.photoSeconds ?? proj[0]?.def ?? 3;

  const contribs = await db
    .select({
      c: schema.contributions,
      uploaderName: schema.users.name,
    })
    .from(schema.contributions)
    .innerJoin(schema.users, eq(schema.contributions.uploaderId, schema.users.id))
    .where(eq(schema.contributions.scheduleId, scheduleId))
    .orderBy(asc(schema.contributions.sortOrder), asc(schema.contributions.createdAt));

  const contribIds = contribs.map((r) => r.c.id);
  const mediaRows = contribIds.length
    ? await db
        .select()
        .from(schema.media)
        .where(inArray(schema.media.contributionId, contribIds))
        .orderBy(asc(schema.media.sortOrder), asc(schema.media.id))
    : [];

  const byContrib = new Map<number, MediaDTO[]>();
  const flat: MediaDTO[] = [];
  for (const m of mediaRows) {
    if (opts.onlyIncluded && !m.included) continue;
    const dto = mediaToDTO(m);
    flat.push(dto);
    const arr = byContrib.get(m.contributionId) ?? [];
    arr.push(dto);
    byContrib.set(m.contributionId, arr);
  }

  const contributions: ContributionDTO[] = contribs.map((r) => ({
    id: r.c.id,
    schedule_id: r.c.scheduleId,
    uploader_id: r.c.uploaderId,
    uploader_name: r.uploaderName,
    story_text: r.c.storyText,
    sort_order: r.c.sortOrder,
    is_mine: opts.userId != null && r.c.uploaderId === opts.userId,
    media: byContrib.get(r.c.id) ?? [],
  }));

  const sb = await ensureStorybook(projectId);
  const narration = await narrationFor(sb.id, scheduleId);

  const items: SceneMediaItem[] = flat.map((m) => ({
    type: m.type,
    included: m.included,
    duration_seconds: m.duration_seconds,
  }));
  const { scene_seconds, target_chars } = sceneLength(items, photoSeconds);

  return {
    schedule: scheduleToDTO(schedule),
    contributions,
    media: flat,
    narration,
    scene_seconds,
    target_chars,
  };
}
