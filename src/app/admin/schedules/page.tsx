import { redirect } from "next/navigation";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { ScheduleManager } from "@/components/admin/schedule-manager";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

function isProjectManager(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
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

  if (!project || !isProjectManager(currentUser, project.members)) {
    redirect("/forbidden");
  }

  const serializedDays = project.days.map((day) => ({
    ...day,
    date: day.date.toISOString(),
  }));
  const scheduleCount = project.days.reduce((total, day) => total + day.schedules.length, 0);
  const emptyDayCount = project.days.filter((day) => day.schedules.length === 0).length;
  const nextSchedule =
    project.days.flatMap((day) =>
      day.schedules.map((schedule) => ({
        ...schedule,
        dayNumber: day.dayNumber,
      })),
    )[0] ?? null;

  return (
    <AppShell title="일정 관리" section="admin">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">일정 관리</h1>
            <p className="text-secondary text-on-surface-variant">
              업로드가 연결될 Day와 세부일정을 미리 정리합니다.
            </p>
          </div>
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            {project.name}
          </Badge>
        </section>

        <section className="grid gap-md md:grid-cols-4">
          <Card>
            <CalendarDays className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">여행 기간</p>
            <p className="text-secondary font-medium text-on-surface">
              {formatDate(project.startDate)} - {formatDate(project.endDate)}
            </p>
          </Card>
          <Card>
            <Clock className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">세부일정</p>
            <p className="text-section-title text-on-surface">{scheduleCount}개</p>
          </Card>
          <Card>
            <MapPin className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">비어 있는 Day</p>
            <p className="text-section-title text-on-surface">{emptyDayCount}개</p>
          </Card>
          <Card>
            <p className="text-metadata text-on-surface-variant">첫 일정</p>
            <p className="mt-xs truncate text-secondary font-medium text-on-surface">
              {nextSchedule
                ? `Day ${nextSchedule.dayNumber} · ${nextSchedule.time ?? "시간 미정"}`
                : "등록된 일정 없음"}
            </p>
            <p className="truncate text-metadata text-on-surface-variant">
              {nextSchedule?.title ?? "세부일정을 추가해 주세요"}
            </p>
          </Card>
        </section>

        <ScheduleManager projectId={project.id} days={serializedDays} />
      </div>
    </AppShell>
  );
}
