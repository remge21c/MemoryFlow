import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { canViewProject } from "@/lib/projects/current";

const activeProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export async function PATCH(request: Request) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const parsed = activeProjectSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success || !user) {
    return NextResponse.json({ error: "프로젝트를 선택해 주세요." }, { status: 400 });
  }

  const isAllowed = await canViewProject(user, parsed.data.projectId);

  if (!isAllowed) {
    return NextResponse.json({ error: "접근할 수 없는 프로젝트입니다." }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { activeProjectId: parsed.data.projectId },
  });

  return NextResponse.json({ ok: true });
}

