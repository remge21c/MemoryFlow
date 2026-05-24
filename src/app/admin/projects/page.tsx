import { redirect } from "next/navigation";
import { FolderKanban } from "lucide-react";
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

export default async function AdminProjectsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.globalRole !== "super_admin") {
    redirect("/forbidden");
  }

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
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
  });

  return (
    <AppShell title="프로젝트 관리" section="admin">
      <div className="grid gap-lg xl:grid-cols-[380px_1fr]">
        <section className="space-y-md">
          <div>
            <h1 className="text-major-title text-on-surface">프로젝트 관리</h1>
            <p className="text-secondary text-on-surface-variant">
              여행 기간을 기준으로 Day를 자동 생성합니다.
            </p>
          </div>
          <Card>
            <h2 className="mb-md text-section-title text-on-surface">새 프로젝트</h2>
            <ProjectCreateForm />
          </Card>
        </section>

        <section className="space-y-md">
          {projects.map((project) => (
            <Card key={project.id}>
              <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-xs">
                    <Badge>{statusLabel[project.status]}</Badge>
                    {currentUser.activeProjectId === project.id ? (
                      <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
                        현재 프로젝트
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="korean-text mt-sm text-screen-title text-on-surface">
                    {project.name}
                  </h2>
                  <p className="mt-xs text-secondary text-on-surface-variant">
                    {project.orgName ?? "소속 없음"} / {formatDate(project.startDate)} - {formatDate(project.endDate)}
                  </p>
                  {project.description ? (
                    <p className="korean-text mt-sm text-secondary text-on-surface-variant">
                      {project.description}
                    </p>
                  ) : null}
                </div>
                <ProjectStatusActions projectId={project.id} status={project.status} />
              </div>

              <div className="mt-md grid gap-sm sm:grid-cols-4">
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
                  <p className="text-metadata text-on-surface-variant">스토리북</p>
                  <p className="text-section-title">
                    {project.storybook?.status === "approved" ? "승인" : "초안"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
