import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { deleteStorageFile } from "@/lib/storage/local";

const updateUploadSchema = z.object({
  dayId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  memo: z.string().trim().max(2000).optional(),
});

async function getEditableUpload(uploadId: string, userId: string, isSuperAdmin: boolean) {
  const upload = await prisma.upload.findFirst({
    where: {
      id: uploadId,
      deletedAt: null,
      ...(isSuperAdmin ? {} : { userId }),
    },
    include: {
      project: {
        select: {
          storybook: { select: { status: true } },
        },
      },
      files: {
        select: { id: true, storagePath: true },
      },
    },
  });

  if (!upload) {
    return { upload: null, response: NextResponse.json({ error: "업로드를 찾을 수 없습니다." }, { status: 404 }) };
  }

  if (upload.project.storybook?.status === "approved") {
    return {
      upload: null,
      response: NextResponse.json(
        { error: "스토리북 승인 후에는 업로드를 수정하거나 삭제할 수 없습니다." },
        { status: 409 },
      ),
    };
  }

  return { upload, response: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const { uploadId } = await params;
  const editable = await getEditableUpload(uploadId, user!.id, user!.globalRole === "super_admin");

  if (editable.response) {
    return editable.response;
  }

  const parsed = updateUploadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const schedule = await prisma.projectSchedule.findFirst({
    where: {
      id: parsed.data.scheduleId,
      dayId: parsed.data.dayId,
      projectId: editable.upload!.projectId,
    },
    select: { id: true },
  });

  if (!schedule) {
    return NextResponse.json({ error: "세부일정을 찾을 수 없습니다." }, { status: 404 });
  }

  const upload = await prisma.upload.update({
    where: { id: editable.upload!.id },
    data: {
      dayId: parsed.data.dayId,
      scheduleId: parsed.data.scheduleId,
      memo: parsed.data.memo || null,
    },
  });

  return NextResponse.json({ upload });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const { uploadId } = await params;
  const editable = await getEditableUpload(uploadId, user!.id, user!.globalRole === "super_admin");

  if (editable.response) {
    return editable.response;
  }

  await prisma.upload.update({
    where: { id: editable.upload!.id },
    data: { deletedAt: new Date() },
  });

  await Promise.all(
    editable.upload!.files.map((file) => deleteStorageFile(file.storagePath).catch(() => null)),
  );

  return NextResponse.json({ ok: true });
}

