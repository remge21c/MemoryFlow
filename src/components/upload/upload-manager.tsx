"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Video } from "lucide-react";
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

export function UploadManager({ days, isLocked }: UploadManagerProps) {
  const router = useRouter();
  const [type, setType] = useState<"photo" | "video">("photo");
  const [dayId, setDayId] = useState(days[0]?.id ?? "");
  const [scheduleId, setScheduleId] = useState(days[0]?.schedules[0]?.id ?? "");
  const [memo, setMemo] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDay = useMemo(
    () => days.find((day) => day.id === dayId) ?? days[0],
    [dayId, days],
  );

  function changeDay(nextDayId: string) {
    const nextDay = days.find((day) => day.id === nextDayId);
    setDayId(nextDayId);
    setScheduleId(nextDay?.schedules[0]?.id ?? "");
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

      Array.from(files ?? []).forEach((file) => body.append("files", file));

      const response = await fetch("/api/uploads", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "업로드에 실패했습니다.");
      }

      setMemo("");
      setFiles(null);
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
        <p className="text-section-title text-on-surface">승인 완료 — 읽기 전용</p>
        <p className="mt-xs text-secondary text-on-surface-variant">
          스토리북 승인 후에는 새 업로드와 수정이 잠깁니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-md">
      <div>
        <h2 className="text-section-title text-on-surface">새 업로드</h2>
        <p className="text-secondary text-on-surface-variant">
          사진은 여러 장, 영상은 완성본 1개만 업로드합니다.
        </p>
      </div>

      <div className="flex gap-xs">
        <Button
          variant={type === "photo" ? "primary" : "secondary"}
          onClick={() => setType("photo")}
        >
          <ImagePlus className="h-4 w-4" />
          사진
        </Button>
        <Button
          variant={type === "video" ? "primary" : "secondary"}
          onClick={() => setType("video")}
        >
          <Video className="h-4 w-4" />
          영상
        </Button>
      </div>

      <div className="grid gap-sm lg:grid-cols-2">
        <select className={inputClass} value={dayId} onChange={(event) => changeDay(event.target.value)}>
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              Day {day.dayNumber} {day.title ?? ""}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          value={scheduleId}
          onChange={(event) => setScheduleId(event.target.value)}
        >
          {(selectedDay?.schedules ?? []).map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {schedule.time ? `${schedule.time} · ` : ""}
              {schedule.title}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className={`${inputClass} min-h-28 w-full resize-y`}
        placeholder="메모를 입력해 주세요"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
      />

      <input
        className={inputClass}
        key={type}
        type="file"
        multiple={type === "photo"}
        accept={type === "photo" ? "image/jpeg,image/png,image/webp,image/heic" : "video/mp4,video/quicktime,video/webm"}
        onChange={(event) => setFiles(event.target.files)}
      />

      <div className="flex items-center justify-between gap-sm">
        <p className="text-metadata text-on-surface-variant">
          {type === "photo" ? "사진 장당 최대 10MB" : "영상 1개, 최대 100MB"}
        </p>
        <Button disabled={isSubmitting || !scheduleId || !files?.length} onClick={submit}>
          {isSubmitting ? "업로드 중..." : "업로드"}
        </Button>
      </div>
      {error ? <p className="text-secondary text-error">{error}</p> : null}
    </Card>
  );
}

