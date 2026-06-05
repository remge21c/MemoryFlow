import path from 'node:path';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { projectDir, saveBuffer } from '../lib/storage.js';
import { fileHash } from '../lib/hash.js';
import { detectType, makeImageDerivatives, makeVideoDerivatives } from './media.js';

export interface UploadedFile {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

/** 업로드 파일들을 기여에 첨부 + 파생 생성. (PRD 6·8·10장) */
export async function addMediaToContribution(
  projectId: number,
  contributionId: number,
  files: UploadedFile[],
): Promise<number[]> {
  const ids: number[] = [];
  const dirs = projectDir(projectId);
  let order = 0;
  for (const f of files) {
    const type = detectType(f.mimetype, f.filename);
    const ext = path.extname(f.filename) || (type === 'video' ? '.mp4' : '.jpg');
    const baseName = nanoid(16);
    const relPath = path.posix.join(type === 'video' ? dirs.videos : dirs.images, `${baseName}${ext}`);
    saveBuffer(relPath, f.buffer);
    const hash = fileHash(f.buffer);

    const inserted = await db
      .insert(schema.media)
      .values({
        contributionId,
        type,
        filePath: relPath,
        fileHash: hash,
        sortOrder: order++,
      })
      .returning({ id: schema.media.id });
    const mediaId = inserted[0]!.id;
    ids.push(mediaId);

    // 파생 (실패해도 원본/행은 유지)
    if (type === 'photo') {
      const d = await makeImageDerivatives(projectId, relPath, baseName);
      if (d) {
        await db
          .update(schema.media)
          .set({ thumbPath: d.thumbPath, previewPath: d.previewPath })
          .where(eq(schema.media.id, mediaId));
      }
    } else {
      const d = await makeVideoDerivatives(projectId, relPath, baseName);
      await db
        .update(schema.media)
        .set({ durationSeconds: d.durationSeconds, thumbPath: d.thumbPath })
        .where(eq(schema.media.id, mediaId));
    }
  }
  return ids;
}
