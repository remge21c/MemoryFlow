import { BookOpen, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MediaPreview } from "@/components/media/media-preview";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export default async function StorybookPage() {
  const currentUser = await getCurrentUser();
  const project = currentUser?.activeProjectId
    ? await prisma.project.findUnique({
        where: { id: currentUser.activeProjectId },
        include: {
          storybook: { select: { status: true, title: true, openingText: true } },
          days: {
            orderBy: { sortOrder: "asc" },
            include: {
              schedules: {
                orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
                include: {
                  uploads: {
                    where: { deletedAt: null, isInStorybook: true },
                    orderBy: { sortOrder: "asc" },
                    include: {
                      files: {
                        orderBy: { sortOrder: "asc" },
                        select: { id: true, fileType: true, mimeType: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  return (
    <AppShell title="스토리북">
      <article className="mx-auto max-w-4xl space-y-xl">
        <header className="space-y-sm">
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            {project?.storybook?.status === "approved" ? "승인 완료" : "승인 준비 중"}
          </Badge>
          <h1 className="korean-text text-major-title text-on-surface">
            {project?.storybook?.title ?? `${project?.name ?? "여행"} 스토리북`}
          </h1>
          <p className="text-body text-on-surface-variant">
            {project?.storybook?.openingText ??
              "Day별 세부일정과 업로드 기록을 읽기 전용 흐름으로 정리합니다."}
          </p>
        </header>

        {project?.days.map((day, index) => (
          <section key={day.id} className="space-y-md">
            <div className="flex items-start gap-md">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary bg-primary-fixed text-primary">
                {index + 1}
              </div>
              <div>
                <p className="text-metadata text-primary">Day {day.dayNumber}</p>
                <h2 className="korean-text text-screen-title text-on-surface">
                  {day.title ?? "여행 일정"}
                </h2>
              </div>
            </div>

            <Card className="ml-0 overflow-hidden p-0 sm:ml-14">
              <MediaPreview
                files={day.schedules.flatMap((schedule) =>
                  schedule.uploads.flatMap((upload) => upload.files),
                )}
                className="aspect-[16/9] rounded-none"
              />
              <div className="space-y-md p-lg">
                <div className="flex items-center gap-sm">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <p className="text-section-title">세부일정 {day.schedules.length}개</p>
                </div>
                <div className="space-y-sm">
                  {day.schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="rounded border border-outline-variant bg-surface-container-lowest p-sm"
                    >
                      <p className="text-secondary font-medium">
                        {schedule.time ? `${schedule.time} · ` : ""}
                        {schedule.title}
                      </p>
                      <p className="text-metadata text-on-surface-variant">
                        {schedule.location ?? "장소 미정"} · 업로드 {schedule.uploads.length}개
                      </p>
                      {schedule.uploads.slice(0, 2).map((upload) => (
                        <p
                          key={upload.id}
                          className="korean-text mt-xs line-clamp-2 text-secondary text-on-surface-variant"
                        >
                          {upload.memo ?? "메모 없음"}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-xs text-metadata text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  스토리북 포함 후보
                </div>
              </div>
            </Card>
          </section>
        ))}

        {!project ? (
          <Card>
            <p className="text-secondary text-on-surface-variant">
              활성 프로젝트를 먼저 선택해 주세요.
            </p>
          </Card>
        ) : null}
      </article>
    </AppShell>
  );
}
