// 영상 제작용 패키지 내보내기 (PRD 11장) — 승인된 스토리북 → outputs/.
// scene-timeline.json 은 8장 길이 모델과 1:1.
import path from 'node:path';
import fs from 'node:fs';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { absPath, projectDir, writeJson, ensureDir } from '../lib/storage.js';
import { buildScene } from './scene.js';

export interface ExportResult {
  dir: string; // 상대경로
  files: string[];
}

export async function exportPackage(projectId: number): Promise<ExportResult> {
  const proj = (
    await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1)
  )[0];
  if (!proj) throw new Error('project not found');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outRel = path.posix.join(projectDir(projectId).outputs, `export-${stamp}`);
  ensureDir(outRel);

  // BGM 파일 복사 처리
  let bgmFile: string | null = null;
  if (proj.bgmPath) {
    const bgmBaseName = path.posix.basename(proj.bgmPath);
    const bgmDestRel = path.posix.join(outRel, `bgm_${bgmBaseName}`);
    try {
      fs.copyFileSync(absPath(proj.bgmPath), absPath(bgmDestRel));
      bgmFile = path.posix.relative(outRel, bgmDestRel);
    } catch {
      /* BGM 파일 누락 대응 */
    }
  }

  // project.json
  writeJson(path.posix.join(outRel, 'project.json'), {
    id: proj.id,
    name: proj.name,
    org_name: proj.orgName,
    description: proj.description,
    start_date: proj.startDate,
    end_date: proj.endDate,
    default_photo_seconds: proj.defaultPhotoSeconds,
    cover_image_path: proj.coverImagePath,
    bgm_path: bgmFile,
    exported_at: new Date().toISOString(),
  });

  const schedules = await db
    .select()
    .from(schema.schedules)
    .where(eq(schema.schedules.projectId, projectId))
    .orderBy(asc(schema.schedules.dayIndex), asc(schema.schedules.sortOrder));

  const mediaRel = path.posix.join(outRel, 'media');
  ensureDir(mediaRel);

  const scenes = [];
  for (const sched of schedules) {
    const scene = await buildScene(projectId, sched.id, { onlyIncluded: true });
    if (!scene) continue;
    const photoSeconds = sched.photoSeconds ?? proj.defaultPhotoSeconds;
    const sceneMedia = scene.media.map((m) => {
      // 미디어 파일 복사
      const baseName = path.posix.basename(m.file_path);
      const destRel = path.posix.join(mediaRel, `${m.id}_${baseName}`);
      try {
        fs.copyFileSync(absPath(m.file_path), absPath(destRel));
      } catch {
        /* 파일 없음은 건너뜀 */
      }
      return {
        id: m.id,
        type: m.type,
        file: path.posix.relative(outRel, destRel),
        duration_seconds:
          m.type === 'video' ? Number(m.duration_seconds ?? 0) : photoSeconds,
      };
    });
    scenes.push({
      schedule_id: sched.id,
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

  // scene-timeline.json (8장 모델 1:1)
  writeJson(path.posix.join(outRel, 'scene-timeline.json'), {
    project_id: projectId,
    total_seconds: scenes.reduce((a, s) => a + s.scene_seconds, 0),
    scenes,
  });

  const exportedFiles = ['project.json', 'scene-timeline.json', 'media/'];
  if (bgmFile) {
    exportedFiles.push(bgmFile);
  }

  return {
    dir: outRel,
    files: exportedFiles,
  };
}
