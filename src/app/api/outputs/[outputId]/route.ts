import { NextResponse } from "next/server";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createMediaResponse, mimeForStoragePath } from "@/lib/storage/local";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ outputId: string }> },
) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const { outputId } = await params;
  const output = await prisma.output.findUnique({
    where: { id: outputId },
    select: {
      projectId: true,
      storagePath: true,
      deletedAt: true,
    },
  });

  if (!output || output.deletedAt) {
    return NextResponse.json({ error: "산출물을 찾을 수 없습니다." }, { status: 404 });
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId: output.projectId, userId: user!.id, status: "active" },
    select: { id: true },
  });

  if (user?.globalRole !== "super_admin" && !membership) {
    return NextResponse.json({ error: "산출물 접근 권한이 없습니다." }, { status: 403 });
  }

  try {
    return await createMediaResponse({
      storagePath: output.storagePath,
      mimeType: mimeForStoragePath(output.storagePath),
      rangeHeader: request.headers.get("range"),
    });
  } catch {
    return NextResponse.json({ error: "산출물을 읽을 수 없습니다." }, { status: 404 });
  }
}
