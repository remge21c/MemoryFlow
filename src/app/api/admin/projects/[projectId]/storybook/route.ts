import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectManagerForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

const storybookMetadataSchema = z.object({
  title: z.string().trim().max(160).optional(),
  openingText: z.string().trim().max(2000).optional(),
  closingText: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const parsed = storybookMetadataSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const storybook = await prisma.storybook.upsert({
    where: { projectId },
    create: {
      projectId,
      title: parsed.data.title || null,
      openingText: parsed.data.openingText || null,
      closingText: parsed.data.closingText || null,
    },
    update: {
      title: parsed.data.title || null,
      openingText: parsed.data.openingText || null,
      closingText: parsed.data.closingText || null,
    },
  });

  return NextResponse.json({ storybook });
}
