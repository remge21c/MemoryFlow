import { NextResponse } from "next/server";
import { requireProjectManagerForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { user, response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const uploads = await prisma.upload.findMany({
    where: {
      projectId,
      deletedAt: null,
      isInStorybook: true,
    },
    orderBy: [{ day: { sortOrder: "asc" } }, { schedule: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      dayId: true,
      scheduleId: true,
      adminNote: true,
      memo: true,
    },
  });

  const storybook = await prisma.storybook.upsert({
    where: { projectId },
    create: { projectId },
    update: {},
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.storybookItem.deleteMany({ where: { storybookId: storybook.id } }),
    ...uploads.map((upload, index) =>
      prisma.storybookItem.create({
        data: {
          storybookId: storybook.id,
          uploadId: upload.id,
          dayId: upload.dayId,
          scheduleId: upload.scheduleId,
          caption: upload.adminNote || upload.memo || null,
          sortOrder: index,
        },
      }),
    ),
    prisma.storybook.update({
      where: { id: storybook.id },
      data: {
        status: "approved",
        approvedBy: user?.id,
        approvedAt: new Date(),
        unlockedBy: null,
        unlockedAt: null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, itemCount: uploads.length });
}
