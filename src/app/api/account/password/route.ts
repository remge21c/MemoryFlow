import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { updatePasswordSchema } from "@/lib/validations/auth";

export async function PATCH(request: Request) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "비밀번호를 확인해 주세요." },
      { status: 400 },
    );
  }

  const account = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { passwordHash: true },
  });

  if (!account || !(await verifyPassword(parsed.data.currentPassword, account.passwordHash))) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
    },
  });

  return NextResponse.json({ ok: true });
}
