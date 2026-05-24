import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdminForApi } from "@/lib/auth/guards";

const approvalSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    role: z.enum(["project_manager", "uploader"]).optional(),
  })
  .optional();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { user: currentUser, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => undefined);
  const parsed = approvalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "프로젝트와 역할을 확인해 주세요." }, { status: 400 });
  }

  const { userId } = await params;
  const projectId = parsed.data?.projectId;
  const role = parsed.data?.role;

  if ((projectId && !role) || (!projectId && role)) {
    return NextResponse.json({ error: "프로젝트와 역할을 함께 선택해 주세요." }, { status: 400 });
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, status: { not: "archived" } },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    if (projectId && role) {
      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        update: {
          role,
          status: "active",
        },
        create: {
          projectId,
          userId,
          role,
          status: "active",
        },
      });
    }

    return tx.user.update({
      where: { id: userId },
      data: {
        status: "active",
        activeProjectId: projectId ?? undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });
  });

  if (currentUser?.id === userId && projectId) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeProjectId: projectId },
    });
  }

  return NextResponse.json({ user });
}
