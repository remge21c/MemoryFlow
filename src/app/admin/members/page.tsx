import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { MemberActions } from "@/components/admin/member-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

const statusLabel: Record<string, string> = {
  pending: "승인 대기",
  active: "활성",
  rejected: "거절",
  inactive: "비활성",
};

const roleLabel: Record<string, string> = {
  super_admin: "슈퍼관리자",
  project_manager: "프로젝트 관리자",
  uploader: "업로더",
};

export default async function AdminMembersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.globalRole !== "super_admin") {
    redirect("/forbidden");
  }

  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        globalRole: true,
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
    }),
    prisma.project.findMany({
      where: { status: { not: "archived" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const pendingCount = users.filter((user) => user.status === "pending").length;

  return (
    <AppShell title="회원 승인" section="admin">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">회원 승인</h1>
            <p className="text-secondary text-on-surface-variant">
              가입 요청을 승인하면서 프로젝트와 역할을 함께 배정합니다.
            </p>
          </div>
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            승인 대기 {pendingCount}명
          </Badge>
        </section>

        <Card className="overflow-hidden p-0">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid gap-md border-b border-outline-variant p-md last:border-b-0 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(360px,1.4fr)]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-xs">
                  <Badge>{statusLabel[user.status]}</Badge>
                  {user.globalRole ? (
                    <Badge className="border-primary text-primary">
                      {roleLabel[user.globalRole]}
                    </Badge>
                  ) : null}
                  {user.id === currentUser.id ? <Badge>내 계정</Badge> : null}
                </div>
                <p className="korean-text mt-sm text-body font-semibold text-on-surface">
                  {user.name}
                </p>
                <p className="truncate text-secondary text-on-surface-variant">{user.email}</p>
              </div>

              <div>
                <p className="text-metadata text-on-surface-variant">프로젝트 역할</p>
                <div className="mt-xs space-y-xs">
                  {user.memberships.length > 0 ? (
                    user.memberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="rounded border border-outline-variant bg-surface-container-lowest p-sm"
                      >
                        <p className="text-secondary font-medium">{membership.project.name}</p>
                        <p className="text-metadata text-primary">{roleLabel[membership.role]}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-secondary text-on-surface-variant">
                      배정된 프로젝트 없음
                    </p>
                  )}
                </div>
              </div>

              <MemberActions
                userId={user.id}
                status={user.status}
                projects={projects}
                isCurrentUser={user.id === currentUser.id}
              />
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  );
}
