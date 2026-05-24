import { redirect } from "next/navigation";
import { CalendarDays, FolderKanban, Users } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { ProjectCreateForm } from "@/components/admin/project-create-form";
import { ProjectStatusActions } from "@/components/admin/project-status-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  active: "진행 중",
  completed: "완료",
  archived: "보관",
};

function statusBadgeClass(status: string) {
  if (status === "active") return "border-primary text-primary";
  if (status === "completed") return "border-primary bg-primary-fixed text-on-primary-fixed";
  return "";
}

export default async function AdminProjectsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.globalRole !== "super_admin") {
    redirect("/forbidden");
  }

  const [projects, managerOptions] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        members: {
          where: { status: "active" },
          select: {
            role: true,
            user: { select: { id: true, name: true, email: true, globalRole: true } },
          },
        },
        _count: {
          select: {
            days: true,
            schedules: true,
            members: true,
          },
        },
        storybook: {
          select: {
            status: true,
            approvedAt: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        status: "active",
        globalRole: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  const activeProject = projects.find((project) => project.id === currentUser.activeProjectId);
  const activeCount = projects.filter((project) => project.status === "active").length;
  const completedCount = projects.filter((project) => project.status === "completed").length;

  return (
    <AppShell title="프로젝트 관리" section="admin">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">프로젝트 관리</h1>
            <p className="text-secondary text-on-surface-variant">
              여행 기간을 기준으로 Day를 생성하고 관리자와 현재 작업 프로젝트를 정합니다.
            </p>
          </div>
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            현재 프로젝트 {activeProject?.name ?? "없음"}
          </Badge>
        </section>

        <section className="grid gap-md md:grid-cols-3">
          <Card>
            <FolderKanban className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">전체 프로젝트</p>
            <p className="text-section-title text-on-surface">{projects.length}개</p>
          </Card>
          <Card>
            <CalendarDays className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">진행 중</p>
            <p className="text-section-title text-on-surface">{activeCount}개</p>
          </Card>
          <Card>
            <Users className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">완료 프로젝트</p>
            <p className="text-section-title text-on-surface">{completedCount}개</p>
          </Card>
        </section>

        <div className="grid gap-lg xl:grid-cols-[400px_1fr]">
          <section className="space-y-md">
            <Card>
              <h2 className="mb-xs text-section-title text-on-surface">새 프로젝트</h2>
              <p className="mb-md text-secondary text-on-surface-variant">
                생성 후 자동으로 현재 프로젝트에 적용됩니다.
              </p>
              <ProjectCreateForm managerOptions={managerOptions} />
            </Card>
          </section>

          <section className="space-y-md">
            {projects.map((project) => {
              const managers = project.members.filter(
                (member) =>
                  member.role === "project_manager" && member.user.globalRole !== "super_admin",
              );
              const isActiveProject = currentUser.activeProjectId === project.id;

              return (
                <Card
                  key={project.id}
                  className={isActiveProject ? "border-primary bg-primary-fixed/20" : ""}
                >
                  <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-xs">
                        <Badge className={statusBadgeClass(project.status)}>
                          {statusLabel[project.status]}
                        </Badge>
                        {isActiveProject ? (
                          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
                            현재 프로젝트
                          </Badge>
                        ) : null}
                        {managers.length === 0 ? (
                          <Badge className="border-error text-error">관리자 미지정</Badge>
                        ) : null}
                      </div>
                      <h2 className="korean-text mt-sm text-screen-title text-on-surface">
                        {project.name}
                      </h2>
                      <p className="mt-xs text-secondary text-on-surface-variant">
                        {project.orgName ?? "소속 없음"} / {formatDate(project.startDate)} -{" "}
                        {formatDate(project.endDate)}
                      </p>
                      {project.description ? (
                        <p className="korean-text mt-sm text-secondary text-on-surface-variant">
                          {project.description}
                        </p>
                      ) : null}
                    </div>
                    <ProjectStatusActions
                      projectId={project.id}
                      status={project.status}
                      isActiveProject={isActiveProject}
                    />
                  </div>

                  <div className="mt-md grid gap-sm sm:grid-cols-5">
                    <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                      <FolderKanban className="h-5 w-5 text-primary" />
                      <p className="mt-xs text-metadata text-on-surface-variant">Day</p>
                      <p className="text-section-title">{project._count.days}</p>
                    </div>
                    <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                      <p className="text-metadata text-on-surface-variant">세부일정</p>
                      <p className="text-section-title">{project._count.schedules}</p>
                    </div>
                    <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                      <p className="text-metadata text-on-surface-variant">멤버</p>
                      <p className="text-section-title">{project._count.members}</p>
                    </div>
                    <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                      <p className="text-metadata text-on-surface-variant">관리자</p>
                      <p className="truncate text-secondary font-medium">
                        {managers.length > 0
                          ? managers.map((manager) => manager.user.name).join(", ")
                          : "미지정"}
                      </p>
                    </div>
                    <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                      <p className="text-metadata text-on-surface-variant">스토리북</p>
                      <p className="text-section-title">
                        {project.storybook?.status === "approved" ? "승인" : "초안"}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
