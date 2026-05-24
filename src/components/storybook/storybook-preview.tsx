import { BookOpen, CalendarDays } from "lucide-react";
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
  return (
    <article className="mx-auto max-w-5xl space-y-xl">
      <section className="space-y-sm">
        <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
          {modeLabel}
        </Badge>
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
      </section>

      {days.map((day) => (
        <section key={day.id} className="space-y-md">
          <div className="flex items-start gap-md">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary bg-primary-fixed text-primary">
              {day.dayNumber}
            </div>
            <div>
              <p className="flex items-center gap-xs text-metadata text-primary">
                <CalendarDays className="h-4 w-4" />
                Day {day.dayNumber} · {formatDate(day.date)}
              </p>
              <h2 className="korean-text text-screen-title text-on-surface">
                {day.title ?? "여행 일정"}
              </h2>
            </div>
          </div>

          <div className="space-y-md sm:ml-14">
            {day.uploads.map((upload) => (
              <Card key={upload.id} className="overflow-hidden p-0">
                <MediaPreview
                  files={upload.files}
                  srcPrefix={mediaSrcPrefix}
                  className="aspect-[16/9] rounded-none"
                />
                <div className="space-y-sm p-lg">
                  <div className="flex flex-wrap items-center gap-xs">
                    <Badge>{upload.type === "video" ? "영상" : "사진"}</Badge>
                    <Badge>
                      {upload.schedule.time ? `${upload.schedule.time} · ` : ""}
                      {upload.schedule.title}
                    </Badge>
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
                  <p className="text-metadata text-on-surface-variant">
                    파일 {upload.files.length}개
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {storybook?.closingText ? (
        <Card>
          <p className="korean-text text-body text-on-surface-variant">{storybook.closingText}</p>
        </Card>
      ) : null}
    </article>
  );
}
