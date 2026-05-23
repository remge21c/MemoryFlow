import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = "admin@memoryflow.local";
const SUPER_ADMIN_PASSWORD = "MemoryFlow!2026";

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function main() {
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      name: "슈퍼 관리자",
      status: "active",
      globalRole: "super_admin",
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      name: "슈퍼 관리자",
      status: "active",
      globalRole: "super_admin",
    },
  });

  let project = await prisma.project.findFirst({
    where: { name: "2026 봄 교토 가족여행" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "2026 봄 교토 가족여행",
        orgName: "MemoryFlow 샘플 프로젝트",
        description: "비 오는 교토에서 가족과 함께한 4일의 기록",
        startDate: new Date("2026-04-10T00:00:00.000Z"),
        endDate: new Date("2026-04-13T00:00:00.000Z"),
        status: "active",
        createdBy: superAdmin.id,
      },
    });
  }

  await prisma.user.update({
    where: { id: superAdmin.id },
    data: { activeProjectId: project.id },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: superAdmin.id,
      },
    },
    update: {
      role: "project_manager",
      status: "active",
    },
    create: {
      projectId: project.id,
      userId: superAdmin.id,
      role: "project_manager",
      status: "active",
    },
  });

  const startDate = new Date("2026-04-10T00:00:00.000Z");
  const dayTitles = [
    "간사이 공항 도착, 교토 이동",
    "기요미즈데라와 산넨자카",
    "은각사와 철학의 길",
    "마지막 산책과 귀가",
  ];

  for (let index = 0; index < dayTitles.length; index += 1) {
    await prisma.projectDay.upsert({
      where: {
        projectId_dayNumber: {
          projectId: project.id,
          dayNumber: index + 1,
        },
      },
      update: {
        title: dayTitles[index],
        sortOrder: index,
      },
      create: {
        projectId: project.id,
        dayNumber: index + 1,
        date: addDays(startDate, index),
        title: dayTitles[index],
        sortOrder: index,
      },
    });
  }

  const days = await prisma.projectDay.findMany({
    where: { projectId: project.id },
    orderBy: { sortOrder: "asc" },
  });

  const scheduleSeeds = [
    { day: 1, time: "11:00", title: "간사이 공항 도착", location: "간사이 국제공항" },
    { day: 1, time: "15:00", title: "교토 숙소 체크인", location: "교토역 근처" },
    { day: 2, time: "10:00", title: "기요미즈데라", location: "히가시야마" },
    { day: 2, time: "14:00", title: "난젠지 산문", location: "난젠지" },
    { day: 3, time: "14:30", title: "철학의 길 산책", location: "철학의 길" },
    { day: 3, time: "16:10", title: "오래된 찻집", location: "은각사 근처" },
  ];

  for (const seed of scheduleSeeds) {
    const day = days[seed.day - 1];
    const existing = await prisma.projectSchedule.findFirst({
      where: {
        projectId: project.id,
        dayId: day.id,
        title: seed.title,
      },
    });

    if (existing) {
      await prisma.projectSchedule.update({
        where: { id: existing.id },
        data: {
          time: seed.time,
          location: seed.location,
          category: "travel",
        },
      });
    } else {
      await prisma.projectSchedule.create({
        data: {
          projectId: project.id,
          dayId: day.id,
          time: seed.time,
          title: seed.title,
          location: seed.location,
          category: "travel",
          sortOrder: seed.day * 100 + Number(seed.time.replace(":", "")),
        },
      });
    }
  }

  await prisma.storybook.upsert({
    where: { projectId: project.id },
    update: {
      title: "비 오는 교토에서 완성된 4일의 이야기",
      openingText: "가족과 함께한 잔잔하고 차분한 기록",
    },
    create: {
      projectId: project.id,
      status: "draft",
      title: "비 오는 교토에서 완성된 4일의 이야기",
      openingText: "가족과 함께한 잔잔하고 차분한 기록",
    },
  });

  console.log("Seed complete");
  console.log(`Super admin: ${SUPER_ADMIN_EMAIL}`);
  console.log(`Temporary password: ${SUPER_ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
