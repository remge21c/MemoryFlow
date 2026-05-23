import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export async function requireCurrentUserForApi() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }

  if (user.status !== "active") {
    return {
      user: null,
      response: NextResponse.json({ error: "활성 계정이 아닙니다." }, { status: 403 }),
    };
  }

  return { user, response: null };
}

export async function requireSuperAdminForApi() {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return { user: null, response };
  }

  if (user?.globalRole !== "super_admin") {
    return {
      user: null,
      response: NextResponse.json({ error: "슈퍼 어드민 권한이 필요합니다." }, { status: 403 }),
    };
  }

  return { user, response: null };
}

export async function requireProjectManagerForApi(projectId: string) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return { user: null, response };
  }

  if (user?.globalRole === "super_admin") {
    return { user, response: null };
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: user?.id,
      role: "project_manager",
      status: "active",
    },
    select: { id: true },
  });

  if (!membership) {
    return {
      user: null,
      response: NextResponse.json({ error: "프로젝트 관리 권한이 필요합니다." }, { status: 403 }),
    };
  }

  return { user, response: null };
}
