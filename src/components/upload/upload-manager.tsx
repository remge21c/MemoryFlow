"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileImage, ImagePlus, Video, X } from "lucide-react";
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

type UploadManagerProps = {
  days: Day[];
  isLocked: boolean;
};

const inputClass =
  "min-h-tap-target rounded border border-outline-variant bg-surface-container-lowest px-sm py-xs text-secondary text-on-surface outline-none focus:border-primary";

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function UploadManager({ days, isLocked }: UploadManagerProps) {
  const router = useRouter();
  const [type, setType] = useState<"photo" | "video">("photo");
  const [dayId, setDayId] = useState(days[0]?.id ?? "");
  const [scheduleId, setScheduleId] = useState(days[0]?.schedules[0]?.id ?? "");
  const [memo, setMemo] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDay = useMemo(
    () => days.find((day) => day.id === dayId) ?? days[0],
    [dayId, days],
  );
  const canSubmit = Boolean(scheduleId && files.length > 0 && !isSubmitting);
  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  function changeDay(nextDayId: string) {
    const nextDay = days.find((day) => day.id === nextDayId);
    setDayId(nextDayId);
    setScheduleId(nextDay?.schedules[0]?.id ?? "");
  }

  function changeType(nextType: "photo" | "video") {
    setType(nextType);
    setFiles([]);
    setFileInputKey((current) => current + 1);
  }

  function changeFiles(fileList: FileList | null) {
    const nextFiles = Array.from(fileList ?? []);
    setFiles(type === "video" ? nextFiles.slice(0, 1) : nextFiles);
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
      setFiles([]);
      setFileInputKey((current) => current + 1);
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
            사진은 여러 장을 묶어 올릴 수 있고, 영상은 편집 완료본 1개만 올립니다.
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

      <div className="grid gap-sm lg:grid-cols-2">
        <label className="grid gap-xs">
          <span className="text-metadata text-on-surface-variant">Day</span>
          <select className={inputClass} value={dayId} onChange={(event) => changeDay(event.target.value)}>
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

      <label className="grid gap-xs">
        <span className="text-metadata text-on-surface-variant">메모</span>
        <textarea
          className={`${inputClass} min-h-28 w-full resize-y`}
          placeholder="이 순간을 설명하는 메모를 남겨 주세요."
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </label>

      <label className="grid gap-xs">
        <span className="text-metadata text-on-surface-variant">파일 선택</span>
        <input
          className={inputClass}
          key={`${type}-${fileInputKey}`}
          type="file"
          multiple={type === "photo"}
          accept={
            type === "photo"
              ? "image/jpeg,image/png,image/webp,image/heic"
              : "video/mp4,video/quicktime,video/webm"
          }
          onChange={(event) => changeFiles(event.target.files)}
        />
      </label>

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
