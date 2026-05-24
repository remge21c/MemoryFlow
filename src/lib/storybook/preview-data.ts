import { prisma } from "@/lib/db";

export async function getStorybookPreviewData(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      storybook: {
        select: {
          status: true,
          title: true,
          openingText: true,
          closingText: true,
        },
      },
      days: {
        orderBy: { sortOrder: "asc" },
        include: {
          schedules: {
            orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
            include: {
              uploads: {
                where: {
                  deletedAt: null,
                  isInStorybook: true,
                },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                include: {
                  files: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, fileType: true, mimeType: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    project: {
      name: project.name,
      orgName: project.orgName,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate.toISOString(),
    },
    storybook: project.storybook,
    days: project.days
      .map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
        date: day.date.toISOString(),
        uploads: day.schedules.flatMap((schedule) =>
          schedule.uploads.map((upload) => ({
            id: upload.id,
            type: upload.type,
            memo: upload.memo,
            adminNote: upload.adminNote,
            files: upload.files,
            schedule: {
              id: schedule.id,
              time: schedule.time,
              title: schedule.title,
              location: schedule.location,
            },
          })),
        ),
      }))
      .filter((day) => day.uploads.length > 0),
  };
}
