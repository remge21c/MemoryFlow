import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminForApi } from "@/lib/auth/guards";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const { userId } = await params;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
    },
  });

  return NextResponse.json({ user });
}
