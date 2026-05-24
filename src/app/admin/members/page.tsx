import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, FolderKanban, Users } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { MemberActions } from "@/components/admin/member-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type MemberRowProps = {
  user: {
    id: string;
    email: string;
    name: string;
    status: string;
    globalRole: string | null;
    memberships: {
      id: string;
      role: string;
      project: {
        id: string;
        name: string;
      };
    }[];
  };
  projects: {
    id: string;
    name: string;
  }[];
  currentUserId: string;
};

function statusBadgeClass(status: string) {
  if (status === "pending") return "border-primary bg-primary-fixed text-on-primary-fixed";
  if (status === "active") return "border-primary text-primary";
  if (status === "rejected") return "border-error text-error";
  return "";
}

function MemberRow({ user, projects, currentUserId }: MemberRowProps) {
  return (
    <div className="grid gap-md border-b border-outline-variant p-md last:border-b-0 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(380px,1.4fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-xs">
          <Badge className={statusBadgeClass(user.status)}>{statusLabel[user.status]}</Badge>
          {user.globalRole ? (
            <Badge className="border-primary text-primary">{roleLabel[user.globalRole]}</Badge>
          ) : null}
          {user.id === currentUserId ? <Badge>내 계정</Badge> : null}
        </div>
        <p className="korean-text mt-sm text-body font-semibold text-on-surface">{user.name}</p>
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
            <p className="text-secondary text-on-surface-variant">배정된 프로젝트 없음</p>
          )}
        </div>
      </div>

      <MemberActions
        userId={user.id}
        status={user.status}
        projects={projects}
        isCurrentUser={user.id === currentUserId}
      />
    </div>
  );
}

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

  const pendingUsers = users.filter((user) => user.status === "pending");
  const otherUsers = users.filter((user) => user.status !== "pending");
  const activeCount = users.filter((user) => user.status === "active").length;

  return (
    <AppShell title="회원 승인" section="admin">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">회원 승인</h1>
            <p className="text-secondary text-on-surface-variant">
              가입 요청을 확인하고 프로젝트와 역할을 함께 지정합니다.
            </p>
          </div>
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            승인 대기 {pendingUsers.length}명
          </Badge>
        </section>

        <section className="grid gap-md md:grid-cols-3">
          <Card>
            <AlertCircle className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">승인 대기</p>
            <p className="text-section-title text-on-surface">{pendingUsers.length}명</p>
          </Card>
          <Card>
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">활성 회원</p>
            <p className="text-section-title text-on-surface">{activeCount}명</p>
          </Card>
          <Card>
            <FolderKanban className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">배정 가능 프로젝트</p>
            <p className="text-section-title text-on-surface">{projects.length}개</p>
          </Card>
        </section>

        {projects.length === 0 ? (
          <Card className="border-primary bg-primary-fixed/30">
            <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-section-title text-on-surface">
                  먼저 프로젝트를 생성해 주세요
                </h2>
                <p className="mt-xs text-secondary text-on-surface-variant">
                  회원 승인은 프로젝트와 역할 배정이 함께 필요합니다. 프로젝트가 없으면
                  가입자를 활성화할 수 없습니다.
                </p>
              </div>
              <Button asChild>
                <Link href="/admin/projects">프로젝트 만들기</Link>
              </Button>
            </div>
          </Card>
        ) : null}

        <section className="space-y-md">
          <div className="flex items-center gap-sm">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-screen-title text-on-surface">승인 대기 회원</h2>
              <p className="text-secondary text-on-surface-variant">
                프로젝트와 역할을 선택한 뒤 승인합니다.
              </p>
            </div>
          </div>
          <Card className="overflow-hidden p-0">
            {pendingUsers.length > 0 ? (
              pendingUsers.map((user) => (
                <MemberRow
                  key={user.id}
                  user={user}
                  projects={projects}
                  currentUserId={currentUser.id}
                />
              ))
            ) : (
              <div className="p-md">
                <p className="text-secondary text-on-surface-variant">
                  지금은 승인 대기 중인 회원이 없습니다.
                </p>
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-md">
          <div>
            <h2 className="text-screen-title text-on-surface">전체 회원</h2>
            <p className="text-secondary text-on-surface-variant">
              활성 회원의 프로젝트 역할을 추가하거나 상태를 변경합니다.
            </p>
          </div>
          <Card className="overflow-hidden p-0">
            {otherUsers.map((user) => (
              <MemberRow
                key={user.id}
                user={user}
                projects={projects}
                currentUserId={currentUser.id}
              />
            ))}
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
