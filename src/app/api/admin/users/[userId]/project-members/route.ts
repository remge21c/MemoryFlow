import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdminForApi } from "@/lib/auth/guards";

const projectMemberSchema = z.object({
  projectId: z.string().uuid(),
  role: z.enum(["project_manager", "uploader"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = projectMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "프로젝트와 역할을 확인해 주세요." }, { status: 400 });
  }

  const { userId } = await params;
  const membership = await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: parsed.data.projectId,
        userId,
      },
    },
    update: {
      role: parsed.data.role,
      status: "active",
    },
    create: {
      projectId: parsed.data.projectId,
      userId,
      role: parsed.data.role,
      status: "active",
    },
    select: {
      id: true,
      role: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "active",
      activeProjectId: parsed.data.projectId,
    },
  });

  return NextResponse.json({ membership });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { user: currentUser, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = z.object({ projectId: z.string().uuid() }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "해제할 프로젝트를 확인해 주세요." }, { status: 400 });
  }

  const { userId } = await params;

  if (currentUser?.id === userId) {
    return NextResponse.json({ error: "내 계정의 프로젝트 역할은 해제할 수 없습니다." }, { status: 400 });
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: parsed.data.projectId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "프로젝트 역할을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.projectMember.update({
    where: { id: membership.id },
    data: { status: "removed" },
  });

  const activeMembership = await prisma.projectMember.findFirst({
    where: {
      userId,
      status: "active",
    },
    select: {
      projectId: true,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      activeProjectId: activeMembership?.projectId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
