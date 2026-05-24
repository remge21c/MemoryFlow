import { BookOpen, CalendarDays, CheckCircle2, Clock, Film, Images } from "lucide-react";
import { MediaPreview } from "@/components/media/media-preview";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type PreviewFile = {
  id: string;
  fileType: "image" | "video";
  mimeType: string | null;
};

type PreviewUpload = {
  id: string;
  type: "photo" | "video";
  memo: string | null;
  adminNote: string | null;
  files: PreviewFile[];
  schedule: {
    id: string;
    time: string | null;
    title: string;
    location: string | null;
  };
};

type PreviewDay = {
  id: string;
  dayNumber: number;
  title: string | null;
  date: string | Date;
  uploads: PreviewUpload[];
};

type StorybookPreviewProps = {
  project: {
    name: string;
    orgName: string | null;
    startDate: string | Date;
    endDate: string | Date;
  };
  storybook: {
    status: "draft" | "approved";
    title: string | null;
    openingText: string | null;
    closingText: string | null;
  } | null;
  days: PreviewDay[];
  mediaSrcPrefix?: string;
  modeLabel?: string;
};

export function StorybookPreview({
  project,
  storybook,
  days,
  mediaSrcPrefix,
  modeLabel = "미리보기",
}: StorybookPreviewProps) {
  const uploadCount = days.reduce((total, day) => total + day.uploads.length, 0);
  const fileCount = days.reduce(
    (total, day) =>
      total + day.uploads.reduce((dayTotal, upload) => dayTotal + upload.files.length, 0),
    0,
  );
  const videoCount = days.reduce(
    (total, day) => total + day.uploads.filter((upload) => upload.type === "video").length,
    0,
  );
  const isApproved = storybook?.status === "approved";

  return (
    <article className="mx-auto max-w-5xl space-y-xl">
      <section className="space-y-lg">
        <div className="space-y-sm">
          <div className="flex flex-wrap items-center gap-xs">
            <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
              {modeLabel}
            </Badge>
            <Badge>{isApproved ? "읽기 전용" : "승인 전 미리보기"}</Badge>
          </div>
          <h1 className="korean-text text-major-title text-on-surface">
            {storybook?.title ?? `${project.name} 스토리북`}
          </h1>
          <p className="text-secondary text-on-surface-variant">
            {project.orgName ?? "소속 없음"} / {formatDate(project.startDate)} -{" "}
            {formatDate(project.endDate)}
          </p>
          <p className="korean-text max-w-3xl text-body text-on-surface-variant">
            {storybook?.openingText ??
              "Day별 세부일정과 업로드 기록을 읽기 전용 흐름으로 정리합니다."}
          </p>
        </div>

        <div className="grid gap-sm sm:grid-cols-4">
          <Card>
            <CalendarDays className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">정리된 Day</p>
            <p className="text-section-title text-on-surface">{days.length}일</p>
          </Card>
          <Card>
            <BookOpen className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">스토리 항목</p>
            <p className="text-section-title text-on-surface">{uploadCount}개</p>
          </Card>
          <Card>
            <Images className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">미디어 파일</p>
            <p className="text-section-title text-on-surface">{fileCount}개</p>
          </Card>
          <Card>
            <Film className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">영상 항목</p>
            <p className="text-section-title text-on-surface">{videoCount}개</p>
          </Card>
        </div>
      </section>

      {days.map((day) => (
        <section key={day.id} className="space-y-md border-l border-outline-variant pl-md sm:pl-lg">
          <div className="flex items-start gap-md">
            <div className="-ml-[37px] flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary bg-primary-fixed text-primary sm:-ml-[45px]">
              {day.dayNumber}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-xs text-metadata text-primary">
                <CalendarDays className="h-4 w-4" />
                Day {day.dayNumber} · {formatDate(day.date)}
              </p>
              <h2 className="korean-text text-screen-title text-on-surface">
                {day.title ?? "여행 일정"}
              </h2>
              <p className="mt-xs text-secondary text-on-surface-variant">
                스토리 항목 {day.uploads.length}개
              </p>
            </div>
          </div>

          <div className="space-y-md">
            {day.uploads.map((upload, index) => (
              <Card key={upload.id} className="overflow-hidden p-0">
                <div className="grid gap-md lg:grid-cols-[minmax(280px,0.95fr)_1fr]">
                  <MediaPreview
                    files={upload.files}
                    srcPrefix={mediaSrcPrefix}
                    className="h-full min-h-[240px] rounded-none"
                  />
                  <div className="space-y-sm p-lg">
                    <div className="flex flex-wrap items-center gap-xs">
                      <Badge>{upload.type === "video" ? "영상" : "사진"}</Badge>
                      <Badge>
                        {upload.schedule.time ? `${upload.schedule.time} · ` : ""}
                        {upload.schedule.title}
                      </Badge>
                      <Badge>#{index + 1}</Badge>
                    </div>
                    <div className="flex items-center gap-sm">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <p className="text-section-title text-on-surface">
                        {upload.schedule.location ?? "기록"}
                      </p>
                    </div>
                    <p className="korean-text text-body text-on-surface-variant">
                      {upload.adminNote ?? upload.memo ?? "메모 없음"}
                    </p>
                    <div className="flex flex-wrap gap-xs text-metadata text-on-surface-variant">
                      <span className="inline-flex items-center gap-1">
                        <Images className="h-4 w-4" />
                        파일 {upload.files.length}개
                      </span>
                      {upload.schedule.time ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {upload.schedule.time}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {storybook?.closingText ? (
        <Card className="border-primary bg-primary-fixed/20">
          <div className="flex items-start gap-sm">
            <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
            <p className="korean-text text-body text-on-surface-variant">{storybook.closingText}</p>
          </div>
        </Card>
      ) : null}
    </article>
  );
}
