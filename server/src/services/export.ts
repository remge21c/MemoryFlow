// 영상 제작용 패키지 매니페스트 (PRD 11장, videoflow-export-spec.md)
// 서버 디스크에 패키지를 만들지 않는다 — 클라이언트가 이 매니페스트를 받아
// 지정한 로컬 폴더(videoflow)에 project.json / scene-timeline.json / media/* 를 직접 기록한다.
import path from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { buildScene } from './scene.js';

export interface ExportFileEntry {
  /** 패키지 내 상대 경로 (예: media/12_abc.jpg, bgm_song.mp3) */
  path: string;
  /** 다운로드 URL (세션 인증 필요) */
  url: string;
}

export interface ExportManifest {
  folder_name: string;
  project: Record<string, unknown>; // project.json 내용
  scene_timeline: Record<string, unknown>; // scene-timeline.json 내용
  files: ExportFileEntry[];
}

export async function buildExportManifest(projectId: number): Promise<ExportManifest> {
  const proj = (
    await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1)
  )[0];
  if (!proj) throw new Error('project not found');

  const files: ExportFileEntry[] = [];

  // BGM
  let bgmFile: string | null = null;
  if (proj.bgmPath) {
    bgmFile = `bgm_${path.posix.basename(proj.bgmPath)}`;
    files.push({ path: bgmFile, url: `/api/projects/${projectId}/bgm` });
  }

  // 대표사진(커버) — BGM과 동일하게 패키지에 실제 파일 포함
  let coverFile: string | null = null;
  if (proj.coverImagePath) {
    coverFile = `cover_${path.posix.basename(proj.coverImagePath)}`;
    files.push({ path: coverFile, url: `/api/projects/${projectId}/cover` });
  }

  const isSeq = proj.scheduleType === 'sequence';
  const projectJson = {
    id: proj.id,
    name: proj.name,
    org_name: proj.orgName,
    description: proj.description,
    schedule_type: proj.scheduleType,
    start_date: isSeq ? null : proj.startDate,
    end_date: isSeq ? null : proj.endDate,
    default_photo_seconds: proj.defaultPhotoSeconds,
    cover_image_path: coverFile,
    bgm_path: bgmFile,
    exported_at: new Date().toISOString(),
  };

  const schedules = await db
    .select()
    .from(schema.schedules)
    .where(eq(schema.schedules.projectId, projectId))
    .orderBy(asc(schema.schedules.dayIndex), asc(schema.schedules.sortOrder));

  const scenes = [];
  for (const sched of schedules) {
    const scene = await buildScene(projectId, sched.id, { onlyIncluded: true });
    if (!scene) continue;
    const photoSeconds = sched.photoSeconds ?? proj.defaultPhotoSeconds;
    const sceneMedia = scene.media.map((m) => {
      const relPath = path.posix.join('media', `${m.id}_${path.posix.basename(m.file_path)}`);
      files.push({ path: relPath, url: `/api/media/${m.id}` });
      return {
        id: m.id,
        type: m.type,
        file: relPath,
        duration_seconds:
          m.type === 'video' ? Number(m.duration_seconds ?? 0) : photoSeconds,
      };
    });
    scenes.push({
      schedule_id: sched.id,
      scene_number: sched.dayIndex,
      day_index: sched.dayIndex,
      title: sched.title,
      time: sched.time,
      place: sched.place,
      photo_seconds: photoSeconds,
      scene_seconds: scene.scene_seconds,
      narration: scene.narration,
      media: sceneMedia,
    });
  }

  const sceneTimeline = {
    project_id: projectId,
    total_seconds: scenes.reduce((a, s) => a + s.scene_seconds, 0),
    scenes,
  };

  return {
    folder_name: proj.name.replace(/[\\/:*?"<>|]/g, '_').trim() || `project-${projectId}`,
    project: projectJson,
    scene_timeline: sceneTimeline,
    files,
  };
}
