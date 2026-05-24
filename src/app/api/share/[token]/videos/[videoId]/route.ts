import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashShareToken } from "@/lib/share-links/token";
import { createMediaResponse, mimeForStoragePath } from "@/lib/storage/local";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; videoId: string }> },
) {
  const { token, videoId } = await params;
  const now = new Date();
  const tokenHash = hashShareToken(token);

  const shareLink = await prisma.shareLink.findUnique({
    where: { tokenHash },
    include: {
      project: {
        select: {
          id: true,
          storybook: { select: { status: true } },
        },
      },
    },
  });

  if (
    !shareLink ||
    !shareLink.isActive ||
    shareLink.expiresAt.getTime() <= now.getTime() ||
    shareLink.project.storybook?.status !== "approved"
  ) {
    return NextResponse.json({ error: "공유 링크가 유효하지 않습니다." }, { status: 404 });
  }

  const video = await prisma.projectVideo.findFirst({
    where: {
      id: videoId,
      projectId: shareLink.projectId,
      deletedAt: null,
      status: "published",
    },
    select: { storagePath: true },
  });

  if (!video) {
    return NextResponse.json({ error: "영상을 찾을 수 없습니다." }, { status: 404 });
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
