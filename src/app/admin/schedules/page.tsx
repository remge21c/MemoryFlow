import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { ScheduleManager } from "@/components/admin/schedule-manager";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

function isProjectManager(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  projectId: string,
  memberships: { userId: string; role: string; status: string }[],
) {
  if (!user) return false;
  if (user.globalRole === "super_admin") return true;
  return memberships.some(
    (membership) =>
      membership.userId === user.id &&
      membership.role === "project_manager" &&
      membership.status === "active",
  );
}

export default async function AdminSchedulesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.activeProjectId) {
    redirect("/settings/project");
  }

  const project = await prisma.project.findUnique({
    where: { id: currentUser.activeProjectId },
    select: {
      id: true,
      name: true,
      orgName: true,
      startDate: true,
      endDate: true,
      members: {
        where: { status: "active" },
        select: { userId: true, role: true, status: true },
      },
      days: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          dayNumber: true,
          date: true,
          title: true,
          schedules: {
            orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
            select: {
              id: true,
              time: true,
              title: true,
              location: true,
              category: true,
            },
          },
        },
      },
    },
  });

  if (!project || !isProjectManager(currentUser, project.id, project.members)) {
    redirect("/");
  }

  const serializedDays = project.days.map((day) => ({
    ...day,
    date: day.date.toISOString(),
  }));

  return (
    <AppShell title="일정 관리" section="admin">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">일정 관리</h1>
            <p className="text-secondary text-on-surface-variant">
              활성 프로젝트의 Day와 세부일정을 관리합니다.
            </p>
          </div>
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            {project.name}
          </Badge>
        </section>

        <ScheduleManager projectId={project.id} days={serializedDays} />
      </div>
    </AppShell>
  );
}
