import { Grid2X2, List } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { UploadListManager } from "@/components/upload/upload-list-manager";
import { UploadManager } from "@/components/upload/upload-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export default async function UploadPage() {
  const currentUser = await getCurrentUser();
  const [project, membership] = currentUser?.activeProjectId
    ? await Promise.all([
        prisma.project.findUnique({
        where: { id: currentUser.activeProjectId },
        include: {
          storybook: { select: { status: true } },
          days: {
            orderBy: { sortOrder: "asc" },
            include: {
              schedules: {
                orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
                select: { id: true, title: true, time: true },
              },
            },
          },
          uploads: {
            where: { userId: currentUser.id, deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: {
              day: { select: { id: true, dayNumber: true } },
              schedule: { select: { id: true, title: true } },
              files: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, fileType: true, mimeType: true },
              },
            },
          },
        },
        }),
        prisma.projectMember.findFirst({
          where: {
            projectId: currentUser.activeProjectId,
            userId: currentUser.id,
            status: "active",
          },
          select: { role: true },
        }),
      ])
    : [null, null];

  const serializedDays =
    project?.days.map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      schedules: day.schedules,
    })) ?? [];

  const serializedUploads =
    project?.uploads.map((upload) => ({
      id: upload.id,
      type: upload.type,
      memo: upload.memo,
      createdAt: upload.createdAt.toISOString(),
      dayId: upload.day.id,
      scheduleId: upload.schedule.id,
      day: { dayNumber: upload.day.dayNumber },
      schedule: upload.schedule,
      files: upload.files,
    })) ?? [];

  const isLocked = project?.storybook?.status === "approved";
  const canUpload =
    currentUser?.globalRole === "super_admin" || membership?.role === "uploader";

  return (
    <AppShell title="업로드">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">업로드</h1>
            <p className="text-secondary text-on-surface-variant">
              Day와 세부일정에 맞춰 사진, 영상, 메모를 남기고 관리합니다.
            </p>
          </div>
          <div className="flex gap-xs">
            <Button variant="secondary" size="icon" aria-label="카드 보기">
              <Grid2X2 className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" aria-label="목록 보기">
              <List className="h-5 w-5" />
            </Button>
          </div>
        </section>

        {project && canUpload ? (
          <UploadManager days={serializedDays} isLocked={Boolean(isLocked)} />
        ) : project ? (
          <Card>
            <h2 className="text-section-title text-on-surface">업로드 권한이 없습니다</h2>
            <p className="mt-xs text-secondary text-on-surface-variant">
              프로젝트 관리자는 일정과 스토리북을 정리할 수 있지만 사진/영상 업로드는 할 수
              없습니다. 업로드가 필요하면 슈퍼관리자에게 업로더 역할을 요청해 주세요.
            </p>
          </Card>
        ) : (
          <Card>
            <p className="text-secondary text-on-surface-variant">
              활성 프로젝트를 먼저 선택해 주세요.
            </p>
          </Card>
        )}

        {project && canUpload ? (
          <UploadListManager
            days={serializedDays}
            uploads={serializedUploads}
            isLocked={Boolean(isLocked)}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
