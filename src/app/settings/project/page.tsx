import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { ProjectSwitcher } from "@/components/settings/project-switcher";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getVisibleProjectsForUser } from "@/lib/projects/current";

export default async function ProjectSettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const projects = await getVisibleProjectsForUser(currentUser);
  const serializedProjects = projects.map((project) => ({
    ...project,
    startDate: project.startDate.toISOString(),
    endDate: project.endDate.toISOString(),
    storybook: project.storybook
      ? {
          ...project.storybook,
          approvedAt: project.storybook.approvedAt?.toISOString() ?? null,
        }
      : null,
  }));

  return (
    <AppShell title="프로젝트 설정">
      <div className="max-w-3xl space-y-lg">
        <div>
          <h1 className="text-major-title text-on-surface">활성 프로젝트</h1>
          <p className="text-secondary text-on-surface-variant">
            프로젝트 전환은 이 페이지에서만 가능합니다.
          </p>
        </div>
        <ProjectSwitcher
          activeProjectId={currentUser.activeProjectId}
          projects={serializedProjects}
        />
      </div>
    </AppShell>
  );
}
