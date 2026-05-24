import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { updateProfileSchema } from "@/lib/validations/auth";

export async function PATCH(request: Request) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "이름과 이메일을 확인해 주세요." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing && existing.id !== user!.id) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user!.id },
    data: {
      name: parsed.data.name.trim(),
      email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      globalRole: true,
      activeProjectId: true,
    },
  });

  const token = await createSessionToken({
    userId: updatedUser.id,
    email: updatedUser.email,
    globalRole: updatedUser.globalRole ?? undefined,
  });

  await setSessionCookie(token);

  return NextResponse.json({ user: updatedUser });
}
