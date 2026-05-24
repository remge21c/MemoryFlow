import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Film,
  ImagePlus,
  Lock,
  Plus,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { MediaPreview } from "@/components/media/media-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

type ScheduleForHome = {
  id: string;
  title: string;
  time: string | null;
  location: string | null;
  dayNumber: number;
  dayTitle: string | null;
  date: Date;
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function projectProgress(startDate: Date, endDate: Date) {
  const now = new Date();
  const start = startDate.getTime();
  const end = endDate.getTime();
  const duration = end - start;

  if (duration <= 0) return now.getTime() >= start ? 100 : 0;
  return clamp(Math.round(((now.getTime() - start) / duration) * 100));
}

function scheduleDateTime(schedule: ScheduleForHome) {
  const [hour = "23", minute = "59"] = (schedule.time ?? "23:59").split(":");
  const value = new Date(schedule.date);
  value.setHours(Number(hour) || 0, Number(minute) || 0, 0, 0);
  return value;
}

function findCurrentOrNextSchedule(schedules: ScheduleForHome[]) {
  const now = new Date();
  const upcoming = schedules.find((schedule) => scheduleDateTime(schedule).getTime() >= now.getTime());
  return {
    schedule: upcoming ?? schedules.at(-1) ?? null,
    label: upcoming ? "다음 세부일정" : "마지막 세부일정",
  };
}

function statusText(status: string) {
  if (status === "approved") return "승인 완료";
  return "정리 중";
}

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const [project, membership] = currentUser?.activeProjectId
    ? await Promise.all([
        prisma.project.findUnique({
          where: { id: currentUser.activeProjectId },
          include: {
            days: {
              orderBy: { sortOrder: "asc" },
              include: {
                schedules: {
                  orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
                  include: {
                    _count: {
                      select: {
                        uploads: { where: { deletedAt: null } },
                      },
                    },
                  },
                },
                _count: {
                  select: {
                    uploads: { where: { deletedAt: null } },
                  },
                },
              },
            },
            uploads: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 6,
              include: {
                day: { select: { dayNumber: true } },
                schedule: { select: { title: true } },
                files: {
                  orderBy: { sortOrder: "asc" },
                  select: { id: true, fileType: true, mimeType: true },
                },
              },
            },
            storybook: {
              select: {
                status: true,
                approvedAt: true,
                _count: { select: { items: true } },
              },
            },
            videos: {
              where: { deletedAt: null },
              orderBy: { uploadedAt: "desc" },
              take: 1,
            },
            _count: {
              select: {
                days: true,
                schedules: true,
                uploads: { where: { deletedAt: null } },
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
  const canUpload =
    currentUser?.globalRole === "super_admin" || membership?.role === "uploader";
  const isApproved = project.storybook?.status === "approved";
  const isLocked = Boolean(isApproved);
  const schedules = project.days.flatMap((day) =>
    day.schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      time: schedule.time,
      location: schedule.location,
      dayNumber: day.dayNumber,
      dayTitle: day.title,
      date: day.date,
    })),
  );
  const scheduleFocus = findCurrentOrNextSchedule(schedules);
  const nextSchedule = scheduleFocus.schedule;
  const photoUploadCount = project.uploads.filter((upload) => upload.type === "photo").length;
  const videoUploadCount = project.uploads.filter((upload) => upload.type === "video").length;
  const latestVideo = project.videos[0];

  return (
    <AppShell title="홈">
      <div className="space-y-xl">
        <section className="grid gap-lg xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="p-lg">
            <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge className="border-primary text-primary">활성 프로젝트</Badge>
                <h1 className="korean-text mt-sm text-major-title text-on-surface">
                  {project.name}
                </h1>
                <p className="mt-xs text-secondary text-on-surface-variant">
                  {project.orgName ?? "소속 미지정"} · {formatDate(project.startDate)} -{" "}
                  {formatDate(project.endDate)}
                </p>
              </div>
              {canUpload && isLocked ? (
                <Button className="self-start" disabled>
                  승인 완료
                  <Lock className="h-4 w-4" />
                </Button>
              ) : canUpload ? (
                <Button asChild className="self-start">
                  <Link href="/upload">
                    새 업로드
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="mt-xl">
              <div className="mb-sm flex items-center justify-between">
                <p className="text-section-title text-on-surface">여행 일정 진행률</p>
                <p className="text-screen-title text-primary">{progress}%</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-container">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-md grid gap-sm sm:grid-cols-3">
                <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <p className="mt-xs text-metadata text-on-surface-variant">Day</p>
                  <p className="text-section-title text-on-surface">{project._count.days}일</p>
                </div>
                <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="mt-xs text-metadata text-on-surface-variant">세부일정</p>
                  <p className="text-section-title text-on-surface">{project._count.schedules}개</p>
                </div>
                <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                  <UploadCloud className="h-5 w-5 text-primary" />
                  <p className="mt-xs text-metadata text-on-surface-variant">전체 업로드</p>
                  <p className="text-section-title text-on-surface">{project._count.uploads}개</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-section-title text-on-surface">{scheduleFocus.label}</p>
                <p className="text-secondary text-on-surface-variant">
                  {nextSchedule
                    ? `Day ${nextSchedule.dayNumber} · ${nextSchedule.time ?? "시간 미정"}`
                    : "등록된 세부일정 없음"}
                </p>
              </div>
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-lg rounded-md border border-outline-variant bg-surface-container-lowest p-md">
              <p className="text-body font-medium text-on-surface">
                {nextSchedule?.title ?? "일정을 등록해 주세요"}
              </p>
              <p className="mt-base text-secondary text-on-surface-variant">
                {nextSchedule?.location ??
                  (nextSchedule ? nextSchedule.dayTitle : "관리자 일정 관리에서 세부일정을 만들 수 있습니다.")}
              </p>
            </div>
            {currentUser?.globalRole === "super_admin" || membership?.role === "project_manager" ? (
              <Button asChild variant="secondary" className="mt-md w-full">
                <Link href="/admin/schedules">
                  일정 관리
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </Card>
        </section>

        <section>
          <div className="mb-md flex flex-col gap-xs sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-screen-title text-on-surface">여행 타임라인</h2>
              <p className="text-secondary text-on-surface-variant">
                Day별 일정과 업로드 정리 상태를 확인합니다.
              </p>
            </div>
            <Badge>{statusText(project.storybook?.status ?? "draft")}</Badge>
          </div>
          <div className="grid gap-md md:grid-cols-2 xl:grid-cols-4">
            {project.days.map((day) => {
              const scheduleCount = day.schedules.length;
              const uploadCount = day._count.uploads;
              const filledCount = day.schedules.filter((schedule) => schedule._count.uploads > 0).length;
              const dayProgress = scheduleCount > 0 ? Math.round((filledCount / scheduleCount) * 100) : 0;

              return (
                <Card key={day.id} className={scheduleCount > 0 ? "" : "border-dashed"}>
                  <div className="flex items-start justify-between gap-sm">
                    <div>
                      <p className="text-metadata text-primary">Day {day.dayNumber}</p>
                      <h3 className="korean-text mt-xs text-section-title text-on-surface">
                        {day.title ?? "여행 일정"}
                      </h3>
                    </div>
                    {dayProgress === 100 && scheduleCount > 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : null}
                  </div>
                  <p className="mt-xs text-secondary text-on-surface-variant">
                    {formatDate(day.date)} · 세부일정 {scheduleCount}개 · 업로드 {uploadCount}개
                  </p>
                  <div className="mt-md h-2 overflow-hidden rounded-full bg-surface-container">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${dayProgress}%` }} />
                  </div>
                  <p className="mt-xs text-metadata text-on-surface-variant">
                    {scheduleCount > 0
                      ? `기록된 세부일정 ${filledCount}/${scheduleCount}`
                      : "세부일정 준비 중"}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-lg xl:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-md flex items-center justify-between">
              <div>
                <h2 className="text-screen-title text-on-surface">최근 업로드</h2>
                <p className="text-secondary text-on-surface-variant">
                  사진 묶음 {photoUploadCount}개 · 영상 {videoUploadCount}개
                </p>
              </div>
              <Button asChild variant="ghost">
                <Link href="/upload">
                  모두 보기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-md sm:grid-cols-2">
              {project.uploads.map((upload) => (
                <Card key={upload.id} className="overflow-hidden p-0">
                  <MediaPreview files={upload.files} className="h-48 rounded-none" />
                  <div className="p-md">
                    <div className="flex flex-wrap gap-xs">
                      <Badge>
                        Day {upload.day.dayNumber} / {upload.schedule.title}
                      </Badge>
                      <Badge className="border-primary text-primary">
                        {upload.type === "video" ? "영상" : `사진 ${upload.files.length}장`}
                      </Badge>
                    </div>
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
                  <ImagePlus className="h-6 w-6 text-primary" />
                  <p className="mt-sm text-section-title text-on-surface">아직 업로드가 없습니다</p>
                  <p className="mt-xs text-secondary text-on-surface-variant">
                    Day와 세부일정에 맞춰 첫 사진이나 영상을 올려 주세요.
                  </p>
                </Card>
              ) : null}
            </div>
          </div>

          <div className="space-y-md">
            <Card>
              <div className="flex items-center gap-sm">
                <BookOpen className="h-5 w-5 text-primary" />
                <p className="text-section-title text-on-surface">최종 스토리북</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                {isApproved
                  ? `승인된 스토리북 ${project.storybook?._count.items ?? 0}개 항목을 열람할 수 있습니다.`
                  : "관리자가 기록을 정리하고 있습니다. 승인 전에는 준비 중 상태로 표시됩니다."}
              </p>
              <Button asChild variant={isApproved ? "primary" : "secondary"} className="mt-md w-full">
                <Link href={isApproved ? "/storybook" : "/admin/storybook"}>
                  {isApproved ? "스토리북 보기" : "스토리북 정리"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>

            <Card>
              <div className="flex items-center gap-sm">
                <Film className="h-5 w-5 text-primary" />
                <p className="text-section-title text-on-surface">최종 영상</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                {latestVideo
                  ? `${latestVideo.title} 영상이 업로드되었습니다.`
                  : isApproved
                    ? "A18 VideoFlow에서 제작한 완성 영상을 업로드할 차례입니다."
                    : "스토리북 승인 후 A18 VideoFlow에서 영상을 제작합니다."}
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-sm">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="text-section-title text-on-surface">승인 상태</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                {isApproved && project.storybook?.approvedAt
                  ? `${formatDate(project.storybook.approvedAt)} 승인 완료. 업로드와 수정은 잠겨 있습니다.`
                  : "승인 전에는 업로더가 계속 기록을 추가할 수 있습니다."}
              </p>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
