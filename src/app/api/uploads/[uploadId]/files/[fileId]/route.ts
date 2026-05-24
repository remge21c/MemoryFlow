import { NextResponse } from "next/server";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { deleteStorageFile } from "@/lib/storage/local";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uploadId: string; fileId: string }> },
) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const { uploadId, fileId } = await params;
  const upload = await prisma.upload.findFirst({
    where: {
      id: uploadId,
      deletedAt: null,
      ...(user!.globalRole === "super_admin" ? {} : { userId: user!.id }),
    },
    include: {
      project: { select: { storybook: { select: { status: true } } } },
      files: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!upload) {
    return NextResponse.json({ error: "업로드를 찾을 수 없습니다." }, { status: 404 });
  }

  if (upload.project.storybook?.status === "approved") {
    return NextResponse.json(
      { error: "스토리북 승인 후에는 파일을 삭제할 수 없습니다." },
      { status: 409 },
    );
  }

  if (upload.files.length <= 1) {
    return NextResponse.json(
      { error: "마지막 파일은 개별 삭제할 수 없습니다. 업로드 삭제를 사용해 주세요." },
      { status: 409 },
    );
  }

  const file = upload.files.find((item) => item.id === fileId);

  if (!file) {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.uploadFile.delete({ where: { id: file.id } });
  await deleteStorageFile(file.storagePath).catch(() => null);

  return NextResponse.json({ ok: true });
}
