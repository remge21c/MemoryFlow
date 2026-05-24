import { NextResponse } from "next/server";
import { requireProjectManagerForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; shareLinkId: string }> },
) {
  const { projectId, shareLinkId } = await params;
  const { response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const shareLink = await prisma.shareLink.findFirst({
    where: { id: shareLinkId, projectId },
    select: { id: true },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "공유 링크를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.shareLink.update({
    where: { id: shareLink.id },
    data: {
      isActive: false,
      disabledAt: new Date(),
    },
    select: {
      id: true,
      isActive: true,
      disabledAt: true,
    },
  });

  return NextResponse.json({ shareLink: updated });
}
