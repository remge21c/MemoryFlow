"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, Video, X } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dayById = useMemo(() => new Map(days.map((day) => [day.id, day])), [days]);

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
        <div className="flex gap-xs">
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

      <div className={view === "card" ? "grid gap-md xl:grid-cols-2" : "space-y-md"}>
        {uploads.map((upload) => {
          const form = forms[upload.id] ?? {
            dayId: upload.dayId,
            scheduleId: upload.scheduleId,
            memo: upload.memo ?? "",
          };
          const selectedDay = dayById.get(form.dayId);

          return (
            <Card key={upload.id} className="overflow-hidden p-0">
              <div className={view === "card" ? "grid gap-md lg:grid-cols-[220px_1fr]" : "grid gap-md lg:grid-cols-[160px_1fr]"}>
                <MediaPreview files={upload.files} className="h-full min-h-[180px] rounded-none" />
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
                    </div>
                    <span className="text-metadata text-on-surface-variant">
                      {formatDate(upload.createdAt)}
                    </span>
                  </div>

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
                      value={form.memo}
                      onChange={(event) => updateForm(upload.id, { memo: event.target.value })}
                    />
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
                          onClick={() =>
                            run(() =>
                              requestJson(`/api/uploads/${upload.id}/files/${file.id}`, "DELETE"),
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-end gap-xs">
                    <Button
                      variant="secondary"
                      disabled={isLocked || isSubmitting || !form.scheduleId}
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
                      onClick={() => run(() => requestJson(`/api/uploads/${upload.id}`, "DELETE"))}
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
      {error ? <p className="text-secondary text-error">{error}</p> : null}
    </section>
  );
}
