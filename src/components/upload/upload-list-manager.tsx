"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, RotateCcw, Trash2, Video, X } from "lucide-react";
import { MediaPreview } from "@/components/media/media-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Schedule = {
  id: string;
  title: string;
  time: string | null;
};

type Day = {
  id: string;
  dayNumber: number;
  title: string | null;
  schedules: Schedule[];
};

type UploadFile = {
  id: string;
  fileType: "image" | "video";
  mimeType: string | null;
};

type Upload = {
  id: string;
  type: "photo" | "video";
  memo: string | null;
  createdAt: string;
  dayId: string;
  scheduleId: string;
  day: { dayNumber: number };
  schedule: { title: string };
  files: UploadFile[];
};

type UploadListManagerProps = {
  days: Day[];
  uploads: Upload[];
  isLocked: boolean;
  photoUploadCount: number;
  videoUploadCount: number;
};

const inputClass =
  "min-h-tap-target rounded border border-outline-variant bg-surface-container-lowest px-sm py-xs text-secondary text-on-surface outline-none focus:border-primary";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function UploadMediaCarousel({
  files,
  className,
}: {
  files: UploadFile[];
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentFile = files[currentIndex];
  const hasMultipleFiles = files.length > 1;

  function move(direction: "previous" | "next") {
    setCurrentIndex((current) =>
      direction === "previous"
        ? (current - 1 + files.length) % files.length
        : (current + 1) % files.length,
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-black ${
        className ?? "aspect-[16/10] min-h-[260px]"
      }`}
    >
      {currentFile ? (
        currentFile.fileType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${currentFile.id}`}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <video
            src={`/api/media/${currentFile.id}`}
            className="h-full w-full object-contain"
            controls
            preload="metadata"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center text-secondary text-white/70">
          파일 없음
        </div>
      )}

      {hasMultipleFiles ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="absolute left-sm top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-white/15 bg-black/25 p-0 text-white shadow-none backdrop-blur-sm transition-colors hover:bg-black/40"
            onClick={() => move("previous")}
            aria-label="이전 미디어"
          >
            <span className="-mt-0.5 text-3xl font-light leading-none text-white drop-shadow">
              ‹
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="absolute right-sm top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-white/15 bg-black/25 p-0 text-white shadow-none backdrop-blur-sm transition-colors hover:bg-black/40"
            onClick={() => move("next")}
            aria-label="다음 미디어"
          >
            <span className="-mt-0.5 text-3xl font-light leading-none text-white drop-shadow">
              ›
            </span>
          </Button>
          <div className="absolute bottom-sm left-1/2 flex -translate-x-1/2 items-center gap-xs rounded-full bg-black/45 px-sm py-xs text-metadata text-white backdrop-blur-sm">
            {currentIndex + 1}/{files.length}
          </div>
        </>
      ) : null}
    </div>
  );
}

async function requestJson(url: string, method: "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "요청 처리에 실패했습니다.");
  }
}

export function UploadListManager({
  days,
  uploads,
  isLocked,
  photoUploadCount,
  videoUploadCount,
}: UploadListManagerProps) {
  const router = useRouter();
  const [forms, setForms] = useState<
    Record<string, { dayId: string; scheduleId: string; memo: string }>
  >(() =>
    Object.fromEntries(
      uploads.map((upload) => [
        upload.id,
        {
          dayId: upload.dayId,
          scheduleId: upload.scheduleId,
          memo: upload.memo ?? "",
        },
      ]),
    ),
  );
  const [view, setView] = useState<"card" | "list">("card");
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dayById = useMemo(() => new Map(days.map((day) => [day.id, day])), [days]);
  const filteredUploads = uploads.filter((upload) => filter === "all" || upload.type === filter);

  function originalForm(upload: Upload) {
    return {
      dayId: upload.dayId,
      scheduleId: upload.scheduleId,
      memo: upload.memo ?? "",
    };
  }

  function isDirty(upload: Upload) {
    const form = forms[upload.id] ?? originalForm(upload);
    const original = originalForm(upload);
    return (
      form.dayId !== original.dayId ||
      form.scheduleId !== original.scheduleId ||
      form.memo !== original.memo
    );
  }

  function updateForm(
    uploadId: string,
    patch: Partial<{ dayId: string; scheduleId: string; memo: string }>,
  ) {
    setForms((current) => ({
      ...current,
      [uploadId]: { ...current[uploadId], ...patch },
    }));
  }

  function changeDay(uploadId: string, nextDayId: string) {
    const nextDay = dayById.get(nextDayId);
    updateForm(uploadId, {
      dayId: nextDayId,
      scheduleId: nextDay?.schedules[0]?.id ?? "",
    });
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setIsSubmitting(true);
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "요청 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm(upload: Upload) {
    setForms((current) => ({
      ...current,
      [upload.id]: originalForm(upload),
    }));
  }

  if (uploads.length === 0) {
    return (
      <Card>
        <h2 className="text-section-title text-on-surface">내 업로드</h2>
        <p className="mt-xs text-secondary text-on-surface-variant">
          아직 업로드한 사진이나 영상이 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-md">
      <div className="flex flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-screen-title text-on-surface">내 업로드 관리</h2>
          <p className="text-secondary text-on-surface-variant">
            사진 묶음 {photoUploadCount}개 · 영상 {videoUploadCount}개
          </p>
        </div>
        <div className="flex flex-wrap gap-xs">
          <Button
            size="sm"
            variant={filter === "all" ? "primary" : "secondary"}
            onClick={() => setFilter("all")}
          >
            전체
          </Button>
          <Button
            size="sm"
            variant={filter === "photo" ? "primary" : "secondary"}
            onClick={() => setFilter("photo")}
          >
            사진
          </Button>
          <Button
            size="sm"
            variant={filter === "video" ? "primary" : "secondary"}
            onClick={() => setFilter("video")}
          >
            영상
          </Button>
          <Button
            size="sm"
            variant={view === "card" ? "primary" : "secondary"}
            onClick={() => setView("card")}
          >
            카드
          </Button>
          <Button
            size="sm"
            variant={view === "list" ? "primary" : "secondary"}
            onClick={() => setView("list")}
          >
            목록
          </Button>
        </div>
      </div>

      {filteredUploads.length === 0 ? (
        <Card>
          <p className="text-secondary text-on-surface-variant">
            선택한 조건에 해당하는 업로드가 없습니다.
          </p>
        </Card>
      ) : (
        <div className={view === "card" ? "grid gap-md xl:grid-cols-2" : "space-y-md"}>
          {filteredUploads.map((upload) => {
            const form = forms[upload.id] ?? originalForm(upload);
            const selectedDay = dayById.get(form.dayId);
            const dirty = isDirty(upload);

            return (
              <Card key={upload.id} className="overflow-hidden p-0">
                <div
                  className={
                    view === "card"
                      ? "flex flex-col"
                      : "grid gap-md lg:grid-cols-[160px_1fr]"
                  }
                >
                  <UploadMediaCarousel
                    files={upload.files}
                    className={
                      view === "card"
                        ? "aspect-[16/10] min-h-[320px] w-full"
                        : "h-full min-h-[180px] w-full"
                    }
                  />
                  <div className="space-y-md p-md">
                    <div className="flex flex-wrap items-center justify-between gap-xs">
                      <div className="flex flex-wrap items-center gap-xs">
                        <Badge className="border-primary text-primary">
                          {upload.type === "video" ? (
                            <>
                              <Video className="mr-1 h-3 w-3" />
                              영상
                            </>
                          ) : (
                            <>
                              <ImagePlus className="mr-1 h-3 w-3" />
                              사진 {upload.files.length}장
                            </>
                          )}
                        </Badge>
                        <Badge>
                          Day {upload.day.dayNumber} / {upload.schedule.title}
                        </Badge>
                        {dirty ? <Badge className="border-primary text-primary">수정 중</Badge> : null}
                      </div>
                      <span className="text-metadata text-on-surface-variant">
                        {formatDate(upload.createdAt)}
                      </span>
                    </div>

                    {isLocked ? (
                      <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                        <p className="text-secondary text-on-surface-variant">
                          승인 완료된 스토리북의 업로드는 읽기 전용입니다.
                        </p>
                      </div>
                    ) : null}

                    <div className="grid gap-sm lg:grid-cols-2">
                      <label className="grid gap-xs">
                        <span className="text-metadata text-on-surface-variant">Day</span>
                        <select
                          className={inputClass}
                          disabled={isLocked}
                          value={form.dayId}
                          onChange={(event) => changeDay(upload.id, event.target.value)}
                        >
                          {days.map((day) => (
                            <option key={day.id} value={day.id}>
                              Day {day.dayNumber} {day.title ?? ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-xs">
                        <span className="text-metadata text-on-surface-variant">세부일정</span>
                        <select
                          className={inputClass}
                          disabled={isLocked}
                          value={form.scheduleId}
                          onChange={(event) =>
                            updateForm(upload.id, { scheduleId: event.target.value })
                          }
                        >
                          {(selectedDay?.schedules ?? []).map((schedule) => (
                            <option key={schedule.id} value={schedule.id}>
                              {schedule.time ? `${schedule.time} - ` : ""}
                              {schedule.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="grid gap-xs">
                      <span className="text-metadata text-on-surface-variant">메모</span>
                      <textarea
                        className={`${inputClass} min-h-24 w-full resize-y`}
                        disabled={isLocked}
                        maxLength={500}
                        value={form.memo}
                        onChange={(event) => updateForm(upload.id, { memo: event.target.value })}
                      />
                      <span className="text-right text-metadata text-on-surface-variant">
                        {form.memo.length}/500
                      </span>
                    </label>

                    <div className="flex flex-wrap gap-xs">
                      {upload.files.map((file, index) => (
                        <div key={file.id} className="relative">
                          <MediaPreview files={[file]} compact />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute right-1 top-1 h-8 w-8 px-0"
                            disabled={isLocked || isSubmitting || upload.files.length <= 1}
                            aria-label={`파일 ${index + 1} 삭제`}
                            onClick={() => {
                              if (!window.confirm("이 파일을 업로드에서 삭제할까요?")) return;
                              run(() =>
                                requestJson(`/api/uploads/${upload.id}/files/${file.id}`, "DELETE"),
                              );
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap justify-end gap-xs">
                      <Button
                        variant="secondary"
                        disabled={isLocked || isSubmitting || !dirty}
                        onClick={() => resetForm(upload)}
                      >
                        <RotateCcw className="h-4 w-4" />
                        변경 취소
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={isLocked || isSubmitting || !form.scheduleId || !dirty}
                        onClick={() =>
                          run(() =>
                            requestJson(`/api/uploads/${upload.id}`, "PATCH", {
                              dayId: form.dayId,
                              scheduleId: form.scheduleId,
                              memo: form.memo,
                            }),
                          )
                        }
                      >
                        수정 저장
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={isLocked || isSubmitting}
                        onClick={() => {
                          if (!window.confirm("이 업로드를 삭제할까요?")) return;
                          run(() => requestJson(`/api/uploads/${upload.id}`, "DELETE"));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        업로드 삭제
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {error ? <p className="text-secondary text-error">{error}</p> : null}
    </section>
  );
}
