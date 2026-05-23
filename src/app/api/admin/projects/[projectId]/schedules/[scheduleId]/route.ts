import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectManagerForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

const updateScheduleSchema = z.object({
  dayId: z.string().uuid(),
  time: z.string().trim().max(20).optional(),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(120),
  location: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; scheduleId: string }> },
) {
  const { projectId, scheduleId } = await params;
  const { response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const parsed = updateScheduleSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const [schedule, day] = await Promise.all([
    prisma.projectSchedule.findFirst({
      where: { id: scheduleId, projectId },
      select: { id: true },
    }),
    prisma.projectDay.findFirst({
      where: { id: parsed.data.dayId, projectId },
      select: { id: true },
    }),
  ]);

  if (!schedule || !day) {
    return NextResponse.json({ error: "수정할 일정을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.projectSchedule.update({
    where: { id: schedule.id },
    data: {
      dayId: day.id,
      time: parsed.data.time || null,
      title: parsed.data.title,
      location: parsed.data.location || null,
      category: parsed.data.category || null,
    },
  });

  return NextResponse.json({ schedule: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; scheduleId: string }> },
) {
  const { projectId, scheduleId } = await params;
  const { response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const schedule = await prisma.projectSchedule.findFirst({
    where: { id: scheduleId, projectId },
    select: {
      id: true,
      _count: {
        select: { uploads: true },
      },
    },
  });

  if (!schedule) {
    return NextResponse.json({ error: "삭제할 일정을 찾을 수 없습니다." }, { status: 404 });
  }

  if (schedule._count.uploads > 0) {
    return NextResponse.json(
      { error: "업로드가 연결된 일정은 삭제할 수 없습니다." },
      { status: 409 },
    );
  }

  await prisma.projectSchedule.delete({ where: { id: schedule.id } });

  return NextResponse.json({ ok: true });
}
