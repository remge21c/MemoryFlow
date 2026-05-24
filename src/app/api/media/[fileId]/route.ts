import { NextResponse } from "next/server";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createMediaResponse } from "@/lib/storage/local";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const { fileId } = await params;
  const file = await prisma.uploadFile.findUnique({
    where: { id: fileId },
    include: {
      upload: {
        select: {
          userId: true,
          projectId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!file || file.upload.deletedAt) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId: file.upload.projectId,
      userId: user!.id,
      status: "active",
    },
    select: { id: true },
  });

  const canRead =
    user?.globalRole === "super_admin" || file.upload.userId === user?.id || Boolean(membership);

  if (!canRead) {
    return NextResponse.json({ error: "파일 접근 권한이 없습니다." }, { status: 403 });
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

