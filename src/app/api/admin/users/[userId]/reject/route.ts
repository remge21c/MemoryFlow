import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminForApi } from "@/lib/auth/guards";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { user: currentUser, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const { userId } = await params;

  if (currentUser?.id === userId) {
    return NextResponse.json({ error: "내 계정은 거절 처리할 수 없습니다." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "rejected" },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
    },
  });

  return NextResponse.json({ user });
}
