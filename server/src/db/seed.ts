// 개발용 시드 — 관리자 + 샘플 프로젝트/일정/기여. (pnpm seed)
import { eq } from 'drizzle-orm';
import { db, schema } from './client.js';
import { migrate } from './migrate.js';
import { hashPassword } from '../lib/password.js';

async function upsertUser(name: string, email: string, password: string, isAdmin: boolean) {
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;
  const r = await db
    .insert(schema.users)
    .values({ name, email, passwordHash: await hashPassword(password), isAdmin })
    .returning({ id: schema.users.id });
  return r[0]!.id;
}

async function main() {
  migrate();

  const adminId = await upsertUser('관리자', 'admin@memoryflow.test', 'admin123', true);
  const upA = await upsertUser('김업로더', 'kim@memoryflow.test', 'pass123', false);
  const upB = await upsertUser('이업로더', 'lee@memoryflow.test', 'pass123', false);

  // 이미 샘플 프로젝트가 있으면 스킵
  const existingProj = await db.select().from(schema.projects).where(eq(schema.projects.name, '여름 수련회 2026')).limit(1);
  if (existingProj[0]) {
    console.log('[seed] 이미 시드됨. admin=admin@memoryflow.test/admin123');
    process.exit(0);
  }

  const proj = (
    await db
      .insert(schema.projects)
      .values({
        name: '여름 수련회 2026',
        orgName: '햇살교회 청년부',
        description: '2박 3일 여름 수련회 기록',
        startDate: '2026-07-15',
        endDate: '2026-07-17',
        defaultPhotoSeconds: 3,
        createdBy: adminId,
      })
      .returning()
  )[0]!;

  await db.insert(schema.storybooks).values({ projectId: proj.id }).onConflictDoNothing();

  // 멤버 합류
  await db.insert(schema.projectMembers).values([
    { projectId: proj.id, userId: upA },
    { projectId: proj.id, userId: upB },
  ]);

  // 일정(장면)
  const scheds = await db
    .insert(schema.schedules)
    .values([
      { projectId: proj.id, dayIndex: 1, time: '14:00', title: '입소 및 오리엔테이션', place: '대강당', category: '행사', sortOrder: 0 },
      { projectId: proj.id, dayIndex: 1, time: '19:00', title: '저녁 집회', place: '본당', category: '집회', sortOrder: 1 },
      { projectId: proj.id, dayIndex: 2, time: '07:00', title: '아침 경건회', place: '야외', category: '집회', sortOrder: 0 },
      { projectId: proj.id, dayIndex: 2, time: '20:00', title: '캠프파이어', place: '운동장', category: '친교', sortOrder: 1 },
    ])
    .returning();

  // 저녁 집회 장면에 두 관점 기여(스토리만, 미디어는 업로드로)
  const evening = scheds.find((s) => s.title === '저녁 집회')!;
  const contribs = await db.insert(schema.contributions).values([
    { projectId: proj.id, scheduleId: evening.id, uploaderId: upA, storyText: '은혜로운 찬양 시간이었다. 모두가 한마음으로 노래하는 순간이 너무 감동적이었음.', sortOrder: 0 },
    { projectId: proj.id, scheduleId: evening.id, uploaderId: upB, storyText: '무대 조명이 너무 예뻤어요. 사진으로 다 담기지 않는 그 오묘한 색감들이 기억에 남네요.', sortOrder: 1 },
  ]).returning();

  const contribA = contribs[0]!;
  const contribB = contribs[1]!;

  // 각 기여별로 mock 사진 2장씩 추가 (총 4장)
  await db.insert(schema.media).values([
    {
      contributionId: contribA.id,
      type: 'photo',
      filePath: 'https://picsum.photos/id/10/800/600',
      thumbPath: 'https://picsum.photos/id/10/200/200',
      sortOrder: 0,
      included: true
    },
    {
      contributionId: contribA.id,
      type: 'photo',
      filePath: 'https://picsum.photos/id/11/800/600',
      thumbPath: 'https://picsum.photos/id/11/200/200',
      sortOrder: 1,
      included: true
    },
    {
      contributionId: contribB.id,
      type: 'photo',
      filePath: 'https://picsum.photos/id/12/800/600',
      thumbPath: 'https://picsum.photos/id/12/200/200',
      sortOrder: 0,
      included: true
    },
    {
      contributionId: contribB.id,
      type: 'photo',
      filePath: 'https://picsum.photos/id/13/800/600',
      thumbPath: 'https://picsum.photos/id/13/200/200',
      sortOrder: 1,
      included: true
    }
  ]);

  console.log('[seed] 완료');
  console.log('  관리자 로그인: admin@memoryflow.test / admin123');
  console.log('  업로더 로그인: kim@memoryflow.test / pass123');
  console.log(`  샘플 프로젝트 id=${proj.id} (장면 ${scheds.length}개)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
