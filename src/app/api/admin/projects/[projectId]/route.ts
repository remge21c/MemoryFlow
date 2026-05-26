import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createProjectDayInputs } from "@/lib/projects/days";

const projectUpdateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    orgName: z.string().max(120).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    managerUserId: z.string().uuid().optional().or(z.literal("")).or(z.literal("__none__")),
    status: z.enum(["active", "completed", "archived"]).optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "종료일은 시작일 이후여야 합니다.",
    path: ["endDate"],
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { user, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = projectUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "프로젝트 정보를 확인해 주세요." },
      { status: 400 },
    );
  }

  const { projectId } = await params;
  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
    select: { startDate: true, endDate: true },
  });

  if (!existingProject) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const startDate = parsed.data.startDate
    ? new Date(`${parsed.data.startDate}T00:00:00.000Z`)
    : existingProject.startDate;
  const endDate = parsed.data.endDate
    ? new Date(`${parsed.data.endDate}T00:00:00.000Z`)
    : existingProject.endDate;
  const shouldSyncDays = Boolean(parsed.data.startDate || parsed.data.endDate);

  try {
    const project = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          name: parsed.data.name?.trim(),
          orgName:
            parsed.data.orgName === undefined ? undefined : parsed.data.orgName?.trim() || null,
          description:
            parsed.data.description === undefined
              ? undefined
              : parsed.data.description?.trim() || null,
          startDate: shouldSyncDays ? startDate : undefined,
          endDate: shouldSyncDays ? endDate : undefined,
          status: parsed.data.status,
        },
      });

      if (shouldSyncDays) {
        const nextDays = createProjectDayInputs(startDate, endDate);
        const existingDays = await tx.projectDay.findMany({
          where: { projectId },
          orderBy: { dayNumber: "asc" },
          include: {
            _count: {
              select: {
                schedules: true,
                uploads: true,
                storybookItems: true,
              },
            },
          },
        });
        const nextDayNumbers = new Set(nextDays.map((day) => day.dayNumber));
        const removableDays = existingDays.filter((day) => !nextDayNumbers.has(day.dayNumber));
        const blockedDay = removableDays.find(
          (day) =>
            day._count.schedules > 0 || day._count.uploads > 0 || day._count.storybookItems > 0,
        );

        if (blockedDay) {
          throw new Error(
            `Day ${blockedDay.dayNumber}에 일정이나 업로드가 있어 기간을 줄일 수 없습니다.`,
          );
        }

        await Promise.all(
          removableDays.map((day) =>
            tx.projectDay.delete({
              where: { id: day.id },
            }),
          ),
        );

        await Promise.all(
          existingDays
            .filter((day) => nextDayNumbers.has(day.dayNumber))
            .map((day, index) =>
              tx.projectDay.update({
                where: { id: day.id },
                data: {
                  date: new Date(Date.UTC(2099, 0, index + 1)),
                },
              }),
            ),
        );

        for (const nextDay of nextDays) {
          const currentDay = existingDays.find((day) => day.dayNumber === nextDay.dayNumber);

          if (currentDay) {
            const isGenericTitle =
              !currentDay.title || currentDay.title === `Day ${currentDay.dayNumber}`;

            await tx.projectDay.update({
              where: { id: currentDay.id },
              data: {
                date: nextDay.date,
                sortOrder: nextDay.sortOrder,
                title: isGenericTitle ? nextDay.title : currentDay.title,
              },
            });
          } else {
            await tx.projectDay.create({
              data: {
                ...nextDay,
                projectId,
              },
            });
          }
        }
      }

      if (parsed.data.managerUserId !== undefined && parsed.data.managerUserId !== "") {
        await tx.projectMember.updateMany({
          where: {
            projectId,
            role: "project_manager",
            userId: { not: user!.id },
          },
          data: { status: "removed" },
        });

        if (parsed.data.managerUserId !== "__none__" && parsed.data.managerUserId !== user!.id) {
          await tx.projectMember.upsert({
            where: {
              projectId_userId: {
                projectId,
                userId: parsed.data.managerUserId,
              },
            },
            update: {
              role: "project_manager",
              status: "active",
            },
            create: {
              projectId,
              userId: parsed.data.managerUserId,
              role: "project_manager",
              status: "active",
            },
          });

          await tx.user.update({
            where: { id: parsed.data.managerUserId },
            data: { status: "active", activeProjectId: projectId },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ project });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "프로젝트 수정에 실패했습니다." },
      { status: 400 },
    );
  }
}
