import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectManagerForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

const orderSchema = z.object({
  direction: z.enum(["up", "down"]),
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

  const parsed = orderSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "이동 방향을 확인해 주세요." }, { status: 400 });
  }

  const [storybook, upload] = await Promise.all([
    prisma.storybook.findUnique({
      where: { projectId },
      select: { status: true },
    }),
    prisma.upload.findFirst({
      where: { id: uploadId, projectId, deletedAt: null },
      select: { id: true, dayId: true, scheduleId: true },
    }),
  ]);

  if (!upload) {
    return NextResponse.json({ error: "업로드를 찾을 수 없습니다." }, { status: 404 });
  }

  if (storybook?.status === "approved") {
    return NextResponse.json(
      { error: "승인된 스토리북은 순서를 변경할 수 없습니다." },
      { status: 409 },
    );
  }

  const siblings = await prisma.upload.findMany({
    where: {
      projectId,
      dayId: upload.dayId,
      scheduleId: upload.scheduleId,
      deletedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const currentIndex = siblings.findIndex((item) => item.id === upload.id);
  const targetIndex = parsed.data.direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
    return NextResponse.json({ ok: true, changed: false });
  }

  const reordered = [...siblings];
  [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];

  await prisma.$transaction(
    reordered.map((item, index) =>
      prisma.upload.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true, changed: true });
}
