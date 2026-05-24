import { NextResponse } from "next/server";
import { requireSuperAdminForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { user, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const storybook = await prisma.storybook.findUnique({
    where: { projectId },
    select: { id: true },
  });

  if (!storybook) {
    return NextResponse.json({ error: "스토리북을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.storybook.update({
    where: { id: storybook.id },
    data: {
      status: "draft",
      approvedBy: null,
      approvedAt: null,
      unlockedBy: user?.id,
      unlockedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
