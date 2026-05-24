import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectManagerForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

const uploadStorybookSchema = z.object({
  isInStorybook: z.boolean(),
  adminNote: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; uploadId: string }> },
) {
  const { projectId, uploadId } = await params;
  const { response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const storybook = await prisma.storybook.findUnique({
    where: { projectId },
    select: { status: true },
  });

  if (storybook?.status === "approved") {
    return NextResponse.json(
      { error: "승인된 스토리북은 수정할 수 없습니다. 먼저 승인 해제가 필요합니다." },
      { status: 409 },
    );
  }

  const parsed = uploadStorybookSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const upload = await prisma.upload.findFirst({
    where: { id: uploadId, projectId, deletedAt: null },
    select: { id: true },
  });

  if (!upload) {
    return NextResponse.json({ error: "업로드를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.upload.update({
    where: { id: upload.id },
    data: {
      isInStorybook: parsed.data.isInStorybook,
      adminNote: parsed.data.adminNote || null,
    },
  });

  return NextResponse.json({ upload: updated });
}
