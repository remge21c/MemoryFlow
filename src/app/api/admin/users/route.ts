import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminForApi } from "@/lib/auth/guards";

export async function GET() {
  const { response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      globalRole: true,
      activeProjectId: true,
      createdAt: true,
      memberships: {
        where: { status: "active" },
        select: {
          id: true,
          role: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ users });
}
