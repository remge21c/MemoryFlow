import { Grid2X2, List, Video } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { UploadManager } from "@/components/upload/upload-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

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
              day: { select: { dayNumber: true } },
              schedule: { select: { title: true } },
              files: { orderBy: { sortOrder: "asc" } },
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

  return (
    <AppShell title="업로드">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">업로드</h1>
            <p className="text-secondary text-on-surface-variant">
              Day와 세부일정에 맞춰 사진, 영상, 메모를 남깁니다.
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
          <UploadManager
            days={serializedDays}
            isLocked={project.storybook?.status === "approved"}
          />
        ) : (
          <Card>
            <p className="text-secondary text-on-surface-variant">
              활성 프로젝트를 먼저 선택해 주세요.
            </p>
          </Card>
        )}

        <section className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
          {project?.uploads.map((upload) => (
            <Card key={upload.id} className="overflow-hidden p-0">
              <div className="relative aspect-[4/3] bg-surface-container">
                <div className="absolute inset-md rounded-md bg-gradient-to-br from-primary-fixed to-surface-container-high" />
                {upload.type === "video" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface">
                      <Video className="h-5 w-5" />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-sm p-md">
                <div className="flex items-center justify-between gap-sm">
                  <Badge>
                    Day {upload.day.dayNumber} / {upload.schedule.title}
                  </Badge>
                  <span className="text-metadata text-on-surface-variant">
                    {formatDate(upload.createdAt)}
                  </span>
                </div>
                <h2 className="korean-text text-section-title text-on-surface">
                  {upload.type === "video" ? "영상" : `사진 ${upload.files.length}장`}
                </h2>
                <p className="line-clamp-2 text-secondary text-on-surface-variant">
                  {upload.memo ?? "메모 없음"}
                </p>
              </div>
            </Card>
          ))}
          {project && project.uploads.length === 0 ? (
            <Card>
              <p className="text-secondary text-on-surface-variant">
                아직 내 업로드가 없습니다.
              </p>
            </Card>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
