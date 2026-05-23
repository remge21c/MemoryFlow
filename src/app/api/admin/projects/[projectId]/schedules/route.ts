import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectManagerForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

const scheduleSchema = z.object({
  dayId: z.string().uuid(),
  time: z.string().trim().max(20).optional(),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(120),
  location: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const days = await prisma.projectDay.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
    include: {
      schedules: {
        orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
      },
    },
  });

  return NextResponse.json({ days });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const day = await prisma.projectDay.findFirst({
    where: { id: parsed.data.dayId, projectId },
    select: { id: true },
  });

  if (!day) {
    return NextResponse.json({ error: "해당 프로젝트의 Day가 아닙니다." }, { status: 404 });
  }

  const latest = await prisma.projectSchedule.findFirst({
    where: { dayId: day.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const schedule = await prisma.projectSchedule.create({
    data: {
      projectId,
      dayId: day.id,
      time: parsed.data.time || null,
      title: parsed.data.title,
      location: parsed.data.location || null,
      category: parsed.data.category || null,
      sortOrder: (latest?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}
