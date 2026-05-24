import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashShareToken } from "@/lib/share-links/token";
import { createMediaResponse } from "@/lib/storage/local";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; fileId: string }> },
) {
  const { token, fileId } = await params;
  const tokenHash = hashShareToken(token);
  const now = new Date();

  const shareLink = await prisma.shareLink.findUnique({
    where: { tokenHash },
    select: {
      projectId: true,
      isActive: true,
      expiresAt: true,
      type: true,
      project: {
        select: {
          storybook: {
            select: {
              status: true,
              items: {
                where: {
                  isVisible: true,
                  upload: {
                    files: {
                      some: { id: fileId },
                    },
                  },
                },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (
    !shareLink ||
    !shareLink.isActive ||
    shareLink.expiresAt.getTime() <= now.getTime() ||
    shareLink.project.storybook?.status !== "approved" ||
    shareLink.project.storybook.items.length === 0
  ) {
    return NextResponse.json({ error: "공유 링크가 유효하지 않습니다." }, { status: 404 });
  }

  const file = await prisma.uploadFile.findUnique({
    where: { id: fileId },
    select: {
      storagePath: true,
      mimeType: true,
      upload: {
        select: {
          projectId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!file || file.upload.deletedAt || file.upload.projectId !== shareLink.projectId) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    return await createMediaResponse({
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      rangeHeader: request.headers.get("range"),
    });
  } catch {
    return NextResponse.json({ error: "파일을 읽을 수 없습니다." }, { status: 404 });
  }
}
