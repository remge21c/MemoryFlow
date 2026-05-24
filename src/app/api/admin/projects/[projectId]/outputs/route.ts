import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { outputFileName, renderOutput } from "@/lib/outputs/render";
import { saveOutputFile } from "@/lib/storage/local";

const createOutputSchema = z.object({
  type: z.enum(["html", "pdf", "doc"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { user, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const parsed = createOutputSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "생성할 산출물 타입을 선택해 주세요." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      storybook: {
        include: {
          items: {
            where: { isVisible: true },
            orderBy: { sortOrder: "asc" },
            include: {
              day: { select: { dayNumber: true, title: true, date: true } },
              schedule: { select: { time: true, title: true, location: true } },
              upload: { select: { memo: true, adminNote: true } },
            },
          },
        },
      },
    },
  });

  if (!project || !project.storybook) {
    return NextResponse.json({ error: "스토리북을 찾을 수 없습니다." }, { status: 404 });
  }

  if (project.storybook.status !== "approved") {
    return NextResponse.json(
      { error: "승인된 스토리북에서만 산출물을 생성할 수 있습니다." },
      { status: 409 },
    );
  }

  if (project.storybook.items.length === 0) {
    return NextResponse.json({ error: "산출물로 만들 스토리 항목이 없습니다." }, { status: 409 });
  }

  const type = parsed.data.type;
  const title = `${project.storybook.title ?? project.name} ${type.toUpperCase()} 산출물`;
  const output = await prisma.output.create({
    data: {
      projectId,
      type,
      title,
      storagePath: "pending",
      generatedBy: user!.id,
    },
    select: { id: true },
  });

  const bytes = renderOutput(type, {
    project: {
      name: project.name,
      orgName: project.orgName,
      startDate: project.startDate,
      endDate: project.endDate,
    },
    storybook: {
      title: project.storybook.title,
      openingText: project.storybook.openingText,
      closingText: project.storybook.closingText,
    },
    items: project.storybook.items,
  });

  const storagePath = await saveOutputFile({
    projectId,
    outputId: output.id,
    fileName: outputFileName(type),
    bytes,
  });

  const updated = await prisma.output.update({
    where: { id: output.id },
    data: { storagePath },
    select: {
      id: true,
      type: true,
      title: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    { output: { ...updated, createdAt: updated.createdAt.toISOString() } },
    { status: 201 },
  );
}
