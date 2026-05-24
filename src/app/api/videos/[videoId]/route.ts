import { NextResponse } from "next/server";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createMediaResponse, mimeForStoragePath } from "@/lib/storage/local";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const { videoId } = await params;
  const video = await prisma.projectVideo.findUnique({
    where: { id: videoId },
    select: {
      projectId: true,
      storagePath: true,
      deletedAt: true,
    },
  });

  if (!video || video.deletedAt) {
    return NextResponse.json({ error: "영상을 찾을 수 없습니다." }, { status: 404 });
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId: video.projectId,
      userId: user!.id,
      status: "active",
    },
    select: { id: true },
  });

  if (user?.globalRole !== "super_admin" && !membership) {
    return NextResponse.json({ error: "영상 접근 권한이 없습니다." }, { status: 403 });
  }

  try {
    return await createMediaResponse({
      storagePath: video.storagePath,
      mimeType: mimeForStoragePath(video.storagePath),
      rangeHeader: request.headers.get("range"),
    });
  } catch {
    return NextResponse.json({ error: "영상을 읽을 수 없습니다." }, { status: 404 });
  }
}
