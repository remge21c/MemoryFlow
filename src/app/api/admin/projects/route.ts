import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdminForApi } from "@/lib/auth/guards";
import { createProjectDayInputs } from "@/lib/projects/days";

const projectCreateSchema = z
  .object({
    name: z.string().min(2).max(120),
    orgName: z.string().max(120).optional(),
    description: z.string().max(1000).optional(),
    startDate: z.string().date(),
    endDate: z.string().date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "종료일은 시작일 이후여야 합니다.",
    path: ["endDate"],
  });

export async function GET() {
  const { response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          days: true,
          schedules: true,
          members: true,
        },
      },
      storybook: {
        select: {
          status: true,
          approvedAt: true,
        },
      },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const { user, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "프로젝트 정보를 확인해 주세요." }, { status: 400 });
  }

  const startDate = new Date(`${parsed.data.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${parsed.data.endDate}T00:00:00.000Z`);
  const dayInputs = createProjectDayInputs(startDate, endDate);

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name: parsed.data.name.trim(),
        orgName: parsed.data.orgName?.trim() || null,
        description: parsed.data.description?.trim() || null,
        startDate,
        endDate,
        createdBy: user!.id,
      },
    });

    await tx.projectDay.createMany({
      data: dayInputs.map((day) => ({
        ...day,
        projectId: created.id,
      })),
    });

    await tx.storybook.create({
      data: {
        projectId: created.id,
        status: "draft",
        title: `${created.name} 스토리북`,
      },
    });

    await tx.projectMember.create({
      data: {
        projectId: created.id,
        userId: user!.id,
        role: "project_manager",
        status: "active",
      },
    });

    await tx.user.update({
      where: { id: user!.id },
      data: { activeProjectId: created.id },
    });

    return created;
  });

  return NextResponse.json({ project }, { status: 201 });
}
