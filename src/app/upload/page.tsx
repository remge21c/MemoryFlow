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
  const project = currentUser?.activeProjectId
    ? await prisma.project.findUnique({
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
      })
    : null;

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

        {project ? (
          <UploadManager days={serializedDays} isLocked={Boolean(isLocked)} />
        ) : (
          <Card>
            <p className="text-secondary text-on-surface-variant">
              활성 프로젝트를 먼저 선택해 주세요.
            </p>
          </Card>
        )}

        {project ? (
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
