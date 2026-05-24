import { ArrowRight, CheckCircle2, Clock, Film, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaPreview } from "@/components/media/media-preview";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

function projectProgress(startDate: Date, endDate: Date) {
  const now = new Date();
  const start = startDate.getTime();
  const end = endDate.getTime();

  if (now.getTime() <= start) return 0;
  if (now.getTime() >= end) return 100;

  return Math.round(((now.getTime() - start) / (end - start)) * 100);
}

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const project = currentUser?.activeProjectId
    ? await prisma.project.findUnique({
        where: { id: currentUser.activeProjectId },
        include: {
          days: {
            orderBy: { sortOrder: "asc" },
            include: {
              schedules: {
                orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
                take: 3,
              },
            },
          },
          uploads: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 4,
            include: {
              day: { select: { dayNumber: true } },
              schedule: { select: { title: true } },
              files: {
                orderBy: { sortOrder: "asc" },
                select: { id: true, fileType: true, mimeType: true },
              },
            },
          },
          storybook: { select: { status: true, approvedAt: true } },
          videos: {
            where: { deletedAt: null },
            orderBy: { uploadedAt: "desc" },
            take: 1,
          },
        },
      })
    : null;

  if (!project) {
    return (
      <AppShell title="홈">
        <Card>
          <h1 className="text-major-title text-on-surface">활성 프로젝트가 없습니다</h1>
          <p className="mt-sm text-secondary text-on-surface-variant">
            프로젝트 설정에서 작업할 여행을 선택해 주세요.
          </p>
          <Button asChild className="mt-md">
            <Link href="/settings/project">프로젝트 설정으로 이동</Link>
          </Button>
        </Card>
      </AppShell>
    );
  }

  const progress = projectProgress(project.startDate, project.endDate);
  const nextSchedule =
    project.days.flatMap((day) =>
      day.schedules.map((schedule) => ({
        ...schedule,
        dayNumber: day.dayNumber,
      })),
    )[0] ?? null;

  return (
    <AppShell title="홈">
      <div className="space-y-xl">
        <section className="grid gap-lg lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-lg">
            <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge>활성 프로젝트</Badge>
                <h1 className="korean-text mt-sm text-major-title text-on-surface">
                  {project.name}
                </h1>
                <p className="mt-xs text-secondary text-on-surface-variant">
                  {formatDate(project.startDate)} - {formatDate(project.endDate)}
                </p>
              </div>
              <Button asChild className="self-start">
                <Link href="/upload">
                  새 업로드
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-xl">
              <div className="mb-sm flex items-center justify-between">
                <p className="text-section-title text-on-surface">정리 진행도</p>
                <p className="text-screen-title text-primary">{progress}%</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-container">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </Card>

          <Card className="p-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-section-title text-on-surface">다음 세부일정</p>
                <p className="text-secondary text-on-surface-variant">
                  {nextSchedule
                    ? `Day ${nextSchedule.dayNumber} · ${nextSchedule.time ?? "시간 미정"}`
                    : "등록된 세부일정 없음"}
                </p>
              </div>
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-lg rounded-md border border-outline-variant bg-surface-container-lowest p-md">
              <p className="text-body font-medium">{nextSchedule?.title ?? "일정을 등록해 주세요"}</p>
              <p className="mt-base text-secondary text-on-surface-variant">
                {nextSchedule?.location ?? "관리자 일정 관리에서 세부일정을 만들 수 있습니다."}
              </p>
            </div>
          </Card>
        </section>

        <section>
          <div className="mb-md flex items-end justify-between">
            <div>
              <h2 className="text-screen-title text-on-surface">여행 타임라인</h2>
              <p className="text-secondary text-on-surface-variant">Day별 정리 상태</p>
            </div>
          </div>
          <div className="grid gap-md md:grid-cols-3">
            {project.days.map((day) => (
              <Card key={day.id} className={day.schedules.length > 0 ? "" : "border-dashed"}>
                <p className="text-metadata text-primary">Day {day.dayNumber}</p>
                <h3 className="korean-text mt-xs text-section-title text-on-surface">
                  {day.title ?? "여행 일정"}
                </h3>
                <p className="mt-sm text-secondary text-on-surface-variant">
                  세부일정 {day.schedules.length}개
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-lg lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-md flex items-center justify-between">
              <h2 className="text-screen-title text-on-surface">최근 업로드</h2>
              <Button variant="ghost">
                모두 보기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-md sm:grid-cols-2">
              {project.uploads.map((upload) => (
                <Card key={upload.id} className="overflow-hidden p-0">
                  <MediaPreview files={upload.files} className="rounded-none" />
                  <div className="p-md">
                    <Badge>
                      Day {upload.day.dayNumber} / {upload.schedule.title}
                    </Badge>
                    <h3 className="korean-text mt-sm text-section-title text-on-surface">
                      {upload.type === "video" ? "영상 업로드" : "사진 업로드"}
                    </h3>
                    <p className="mt-xs line-clamp-2 text-secondary text-on-surface-variant">
                      {upload.memo ?? "메모 없음"}
                    </p>
                  </div>
                </Card>
              ))}
              {project.uploads.length === 0 ? (
                <Card>
                  <p className="text-secondary text-on-surface-variant">
                    아직 업로드된 사진이나 영상이 없습니다.
                  </p>
                </Card>
              ) : null}
            </div>
          </div>

          <div className="space-y-md">
            <Card>
              <div className="flex items-center gap-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-section-title">최종 스토리북</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                {project.storybook?.status === "approved"
                  ? "승인된 스토리북을 열람할 수 있습니다."
                  : "관리자가 기록을 정리하고 있습니다. 승인 후 스토리북으로 공개됩니다."}
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-sm">
                <Film className="h-5 w-5 text-primary" />
                <p className="text-section-title">최종 영상</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                {project.videos.length > 0
                  ? "완성된 영상이 업로드되었습니다."
                  : "스토리북 승인 후 A18 VideoFlow에서 제작한 영상이 업로드됩니다."}
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-sm">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="text-section-title">AI 검수</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                메모 요약, 개인정보 의심 문구, 자막 초안을 검토합니다.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
