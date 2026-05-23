import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdminForApi } from "@/lib/auth/guards";

const projectUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  orgName: z.string().max(120).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = projectUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "프로젝트 정보를 확인해 주세요." }, { status: 400 });
  }

  const { projectId } = await params;
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: parsed.data.name?.trim(),
      orgName: parsed.data.orgName?.trim() || parsed.data.orgName,
      description: parsed.data.description?.trim() || parsed.data.description,
      status: parsed.data.status,
    },
  });

  return NextResponse.json({ project });
}
