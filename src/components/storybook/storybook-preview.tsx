"use client";

import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Images,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type ScheduleStory = {
  id: string;
  time: string | null;
  title: string;
  location: string | null;
  uploads: PreviewUpload[];
};

type MediaStoryItem = {
  id: string;
  fileType: "image" | "video";
  caption: string;
  uploadType: "photo" | "video";
  uploadIndex: number;
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

function groupUploadsBySchedule(uploads: PreviewUpload[]) {
  const schedules = new Map<string, ScheduleStory>();

  uploads.forEach((upload) => {
    const current = schedules.get(upload.schedule.id);

    if (current) {
      current.uploads.push(upload);
      return;
    }

    schedules.set(upload.schedule.id, {
      id: upload.schedule.id,
      time: upload.schedule.time,
      title: upload.schedule.title,
      location: upload.schedule.location,
      uploads: [upload],
    });
  });

  return Array.from(schedules.values());
}

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

          <div className="space-y-lg">
            {groupUploadsBySchedule(day.uploads).map((schedule) => (
              <ScheduleStoryCard
                key={schedule.id}
                schedule={schedule}
                mediaSrcPrefix={mediaSrcPrefix}
              />
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

function ScheduleStoryCard({
  schedule,
  mediaSrcPrefix = "/api/media",
}: {
  schedule: ScheduleStory;
  mediaSrcPrefix?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mediaItems = schedule.uploads.flatMap((upload, uploadIndex) =>
    upload.files.map((file, fileIndex) => ({
      id: file.id,
      fileType: file.fileType,
      caption: upload.adminNote || upload.memo || "기록된 메모가 없습니다.",
      uploadType: upload.type,
      uploadIndex: uploadIndex + fileIndex,
    })),
  ) satisfies MediaStoryItem[];
  const currentItem = mediaItems[currentIndex];
  const hasMultipleItems = mediaItems.length > 1;
  const mediaCount = mediaItems.length;

  function move(direction: "previous" | "next") {
    setCurrentIndex((current) =>
      direction === "previous"
        ? (current - 1 + mediaCount) % mediaCount
        : (current + 1) % mediaCount,
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-outline-variant p-md">
        <div className="flex flex-wrap items-center gap-xs">
          {schedule.time ? <Badge>{schedule.time}</Badge> : null}
          <Badge>{schedule.uploads.length}개 기록</Badge>
          <Badge>{mediaCount}개 미디어</Badge>
        </div>
        <h3 className="korean-text mt-sm text-screen-title text-on-surface">{schedule.title}</h3>
        <div className="mt-xs flex flex-wrap gap-sm text-secondary text-on-surface-variant">
          {schedule.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {schedule.location}
            </span>
          ) : null}
          {schedule.time ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {schedule.time}
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative aspect-[16/10] min-h-[320px] bg-black sm:aspect-video">
        {currentItem ? (
          currentItem.fileType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${mediaSrcPrefix}/${currentItem.id}`}
              alt=""
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <video
              src={`${mediaSrcPrefix}/${currentItem.id}`}
              className="h-full w-full object-contain"
              controls
              preload="metadata"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-secondary text-white/70">
            표시할 미디어가 없습니다.
          </div>
        )}

        {hasMultipleItems ? (
          <>
            <Button
              type="button"
              variant="secondary"
              className="absolute left-sm top-1/2 -translate-y-1/2"
              onClick={() => move("previous")}
              aria-label="이전 미디어"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="absolute right-sm top-1/2 -translate-y-1/2"
              onClick={() => move("next")}
              aria-label="다음 미디어"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        ) : null}

        {currentItem ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-md pb-md pt-xl text-white">
            <div className="mb-xs flex flex-wrap items-center gap-xs">
              <Badge className="border-white/40 bg-white/15 text-white">
                {currentItem.fileType === "video" ? "영상" : "사진"}
              </Badge>
              <Badge className="border-white/40 bg-white/15 text-white">
                {currentIndex + 1}/{mediaCount}
              </Badge>
            </div>
            <p className="korean-text text-body font-medium leading-relaxed">
              {currentItem.caption}
            </p>
          </div>
        ) : null}
      </div>

      {hasMultipleItems ? (
        <div className="flex items-center justify-between gap-sm border-t border-outline-variant p-sm">
          <div className="flex min-w-0 flex-1 gap-xs overflow-x-auto">
            {mediaItems.map((item, index) => (
              <button
                key={`${item.id}-${index}`}
                type="button"
                className={`h-14 w-20 shrink-0 overflow-hidden rounded border ${
                  index === currentIndex ? "border-primary" : "border-outline-variant"
                }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`${index + 1}번째 미디어 보기`}
              >
                {item.fileType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${mediaSrcPrefix}/${item.id}`}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-container">
                    <Film className="h-5 w-5 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="shrink-0 text-metadata text-on-surface-variant">
            넘겨보기 {currentIndex + 1}/{mediaCount}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
