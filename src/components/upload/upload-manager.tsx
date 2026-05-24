"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileImage, ImagePlus, UploadCloud, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

type UploadManagerProps = {
  days: Day[];
  isLocked: boolean;
};

const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const photoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

const inputClass =
  "min-h-tap-target rounded border border-outline-variant bg-surface-container-lowest px-sm py-xs text-secondary text-on-surface outline-none focus:border-primary";

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function fileErrors(type: "photo" | "video", file: File) {
  if (type === "photo") {
    if (!photoTypes.has(file.type)) return `${file.name}: 지원하지 않는 사진 형식입니다.`;
    if (file.size > PHOTO_MAX_BYTES) return `${file.name}: 사진은 장당 10MB까지 가능합니다.`;
    return null;
  }

  if (!videoTypes.has(file.type)) return `${file.name}: 지원하지 않는 영상 형식입니다.`;
  if (file.size > VIDEO_MAX_BYTES) return `${file.name}: 영상은 100MB까지 가능합니다.`;
  return null;
}

export function UploadManager({ days, isLocked }: UploadManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<"photo" | "video">("photo");
  const [dayId, setDayId] = useState(days[0]?.id ?? "");
  const [scheduleId, setScheduleId] = useState(days[0]?.schedules[0]?.id ?? "");
  const [memo, setMemo] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDay = useMemo(
    () => days.find((day) => day.id === dayId) ?? days[0],
    [dayId, days],
  );
  const selectedSchedule = selectedDay?.schedules.find((schedule) => schedule.id === scheduleId);
  const hasSchedules = days.some((day) => day.schedules.length > 0);
  const canSubmit = Boolean(scheduleId && files.length > 0 && !isSubmitting && hasSchedules);
  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  function changeDay(nextDayId: string) {
    const nextDay = days.find((day) => day.id === nextDayId);
    setDayId(nextDayId);
    setScheduleId(nextDay?.schedules[0]?.id ?? "");
  }

  function resetFiles() {
    setFiles([]);
    setFileInputKey((current) => current + 1);
  }

  function changeType(nextType: "photo" | "video") {
    setType(nextType);
    setError(null);
    resetFiles();
  }

  function applyFiles(nextFileList: FileList | File[]) {
    const nextFiles = Array.from(nextFileList);
    const pickedFiles = type === "video" ? nextFiles.slice(0, 1) : nextFiles;
    const validationError = pickedFiles.map((file) => fileErrors(type, file)).find(Boolean);

    if (validationError) {
      setError(validationError);
      resetFiles();
      return;
    }

    setError(null);
    setFiles(pickedFiles);
  }

  async function submit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.set("type", type);
      body.set("dayId", dayId);
      body.set("scheduleId", scheduleId);
      body.set("memo", memo);

      files.forEach((file) => body.append("files", file));

      const response = await fetch("/api/uploads", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "업로드에 실패했습니다.");
      }

      setMemo("");
      resetFiles();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "업로드에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLocked) {
    return (
      <Card className="border-primary bg-primary-fixed/30">
        <p className="text-section-title text-on-surface">승인 완료 - 읽기 전용</p>
        <p className="mt-xs text-secondary text-on-surface-variant">
          스토리북 승인 후에는 추가 업로드와 수정이 잠깁니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-md">
      <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-section-title text-on-surface">새 업로드</h2>
          <p className="text-secondary text-on-surface-variant">
            Day와 세부일정을 먼저 맞춘 뒤 사진 묶음이나 편집 완료 영상을 올립니다.
          </p>
        </div>
        <Badge className="border-primary text-primary">
          {type === "photo" ? "사진 장당 10MB" : "영상 1개 100MB"}
        </Badge>
      </div>

      <div className="grid gap-sm sm:grid-cols-2">
        <Button
          type="button"
          variant={type === "photo" ? "primary" : "secondary"}
          onClick={() => changeType("photo")}
        >
          <ImagePlus className="h-4 w-4" />
          사진 묶음
        </Button>
        <Button
          type="button"
          variant={type === "video" ? "primary" : "secondary"}
          onClick={() => changeType("video")}
        >
          <Video className="h-4 w-4" />
          영상 1개
        </Button>
      </div>

      {!hasSchedules ? (
        <div className="rounded border border-dashed border-outline-variant bg-surface-container-lowest p-md">
          <p className="text-section-title text-on-surface">등록된 세부일정이 없습니다</p>
          <p className="mt-xs text-secondary text-on-surface-variant">
            업로드는 Day와 세부일정에 연결되어야 합니다. 먼저 관리자 일정 관리에서 세부일정을 만들어 주세요.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-sm lg:grid-cols-2">
            <label className="grid gap-xs">
              <span className="text-metadata text-on-surface-variant">Day</span>
              <select
                className={inputClass}
                value={dayId}
                onChange={(event) => changeDay(event.target.value)}
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
                value={scheduleId}
                onChange={(event) => setScheduleId(event.target.value)}
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

          <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
            <p className="text-metadata text-on-surface-variant">선택된 위치</p>
            <p className="mt-xs text-secondary font-medium text-on-surface">
              Day {selectedDay?.dayNumber ?? "-"} · {selectedSchedule?.title ?? "세부일정 미선택"}
            </p>
          </div>
        </>
      )}

      <label className="grid gap-xs">
        <span className="text-metadata text-on-surface-variant">메모</span>
        <textarea
          className={`${inputClass} min-h-28 w-full resize-y`}
          maxLength={500}
          placeholder="이 순간을 설명하는 메모를 남겨 주세요."
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
        <span className="text-right text-metadata text-on-surface-variant">{memo.length}/500</span>
      </label>

      <div
        className={cn(
          "rounded border border-dashed border-outline-variant bg-surface-container-lowest p-md transition-colors",
          isDragging && "border-primary bg-primary-fixed/30",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          applyFiles(event.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-start gap-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded bg-primary-fixed text-primary">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-section-title text-on-surface">파일 선택</p>
              <p className="text-secondary text-on-surface-variant">
                {type === "photo"
                  ? "사진을 여러 장 선택하거나 이 영역에 끌어다 놓으세요."
                  : "편집 완료된 영상 파일 1개를 선택하세요."}
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            찾아보기
          </Button>
        </div>
        <input
          ref={fileInputRef}
          className="sr-only"
          key={`${type}-${fileInputKey}`}
          type="file"
          multiple={type === "photo"}
          accept={
            type === "photo"
              ? "image/jpeg,image/png,image/webp,image/heic"
              : "video/mp4,video/quicktime,video/webm"
          }
          onChange={(event) => applyFiles(event.target.files ?? [])}
        />
      </div>

      <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
        <div className="flex flex-wrap items-center justify-between gap-xs">
          <p className="text-secondary font-medium text-on-surface">선택된 파일</p>
          <p className="text-metadata text-on-surface-variant">
            {files.length}개 · {formatBytes(totalBytes)}
          </p>
        </div>
        {files.length > 0 ? (
          <div className="mt-sm space-y-xs">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-sm rounded border border-outline-variant bg-surface p-xs"
              >
                <div className="flex min-w-0 items-center gap-xs">
                  <FileImage className="h-4 w-4 flex-shrink-0 text-primary" />
                  <p className="truncate text-secondary text-on-surface">{file.name}</p>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="text-metadata text-on-surface-variant">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    className="focus-ring flex h-8 w-8 items-center justify-center rounded hover:bg-surface-container-low"
                    aria-label={`${file.name} 제거`}
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-xs text-secondary text-on-surface-variant">
            아직 선택된 파일이 없습니다.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-metadata text-on-surface-variant">
          {type === "photo"
            ? "지원 형식: jpg, png, webp, heic"
            : "지원 형식: mp4, mov, webm"}
        </p>
        <Button disabled={!canSubmit} onClick={submit}>
          {isSubmitting ? "업로드 중..." : "업로드"}
        </Button>
      </div>
      {error ? <p className="text-secondary text-error">{error}</p> : null}
    </Card>
  );
}
