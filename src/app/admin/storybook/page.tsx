import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { StorybookEditor } from "@/components/admin/storybook-editor";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

function canManageStorybook(
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

export default async function AdminStorybookPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.activeProjectId) {
    redirect("/settings/project");
  }

  const project = await prisma.project.findUnique({
    where: { id: currentUser.activeProjectId },
    include: {
      members: {
        where: { status: "active" },
        select: { userId: true, role: true, status: true },
      },
      storybook: {
        select: {
          status: true,
          title: true,
          openingText: true,
          closingText: true,
          approvedAt: true,
        },
      },
      days: {
        orderBy: { sortOrder: "asc" },
        include: {
          schedules: {
            orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
            include: {
              uploads: {
                where: { deletedAt: null },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                include: {
                  user: { select: { name: true } },
                  files: {
                    select: { id: true, fileType: true, mimeType: true },
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      },
      shareLinks: {
        where: { type: "storybook" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
          disabledAt: true,
          creator: { select: { name: true } },
        },
      },
    },
  });

  if (!project || !canManageStorybook(currentUser, project.members)) {
    redirect("/");
  }

  const storybook = project.storybook ?? {
    status: "draft" as const,
    title: null,
    openingText: null,
    closingText: null,
    approvedAt: null,
  };

  const serializedDays = project.days.map((day) => ({
    id: day.id,
    dayNumber: day.dayNumber,
    title: day.title,
    schedules: day.schedules.map((schedule) => ({
      id: schedule.id,
      time: schedule.time,
      title: schedule.title,
      location: schedule.location,
      uploads: schedule.uploads.map((upload) => ({
        id: upload.id,
        type: upload.type,
        memo: upload.memo,
        isInStorybook: upload.isInStorybook,
        adminNote: upload.adminNote,
        sortOrder: upload.sortOrder,
        user: upload.user,
        files: upload.files,
      })),
    })),
  }));

  const uploadCount = serializedDays.reduce(
    (total, day) =>
      total + day.schedules.reduce((dayTotal, schedule) => dayTotal + schedule.uploads.length, 0),
    0,
  );

  return (
    <AppShell title="스토리북 승인" section="admin">
      {uploadCount > 0 ? (
        <StorybookEditor
          projectId={project.id}
          isSuperAdmin={currentUser.globalRole === "super_admin"}
          storybook={{
            ...storybook,
            approvedAt: storybook.approvedAt?.toISOString() ?? null,
          }}
          days={serializedDays}
          shareLinks={project.shareLinks.map((shareLink) => ({
            ...shareLink,
            expiresAt: shareLink.expiresAt.toISOString(),
            createdAt: shareLink.createdAt.toISOString(),
            disabledAt: shareLink.disabledAt?.toISOString() ?? null,
          }))}
        />
      ) : (
        <Card>
          <h1 className="text-major-title text-on-surface">스토리북 편집</h1>
          <p className="mt-sm text-secondary text-on-surface-variant">
            아직 업로드된 사진이나 영상이 없습니다. 업로드가 모이면 이곳에서 포함 여부와
            캡션을 정리하고 승인할 수 있습니다.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
