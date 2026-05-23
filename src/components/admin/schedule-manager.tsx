"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Schedule = {
  id: string;
  time: string | null;
  title: string;
  location: string | null;
  category: string | null;
};

type Day = {
  id: string;
  dayNumber: number;
  date: string;
  title: string | null;
  schedules: Schedule[];
};

type ScheduleManagerProps = {
  projectId: string;
  days: Day[];
};

type FormState = {
  dayId: string;
  time: string;
  title: string;
  location: string;
  category: string;
};

const inputClass =
  "min-h-tap-target rounded border border-outline-variant bg-surface-container-lowest px-sm py-xs text-secondary text-on-surface outline-none focus:border-primary";

async function requestJson(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "일정 처리에 실패했습니다.");
  }
}

function emptyForm(dayId: string): FormState {
  return {
    dayId,
    time: "",
    title: "",
    location: "",
    category: "",
  };
}

function scheduleToForm(dayId: string, schedule: Schedule): FormState {
  return {
    dayId,
    time: schedule.time ?? "",
    title: schedule.title,
    location: schedule.location ?? "",
    category: schedule.category ?? "",
  };
}

export function ScheduleManager({ projectId, days }: ScheduleManagerProps) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState<FormState>(emptyForm(days[0]?.id ?? ""));
  const [editForms, setEditForms] = useState<Record<string, FormState>>(() =>
    Object.fromEntries(
      days.flatMap((day) =>
        day.schedules.map((schedule) => [schedule.id, scheduleToForm(day.id, schedule)]),
      ),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateCreate(field: keyof FormState, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function updateEdit(scheduleId: string, field: keyof FormState, value: string) {
    setEditForms((current) => ({
      ...current,
      [scheduleId]: { ...current[scheduleId], [field]: value },
    }));
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setIsSubmitting(true);
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "일정 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createSchedule() {
    await requestJson(`/api/admin/projects/${projectId}/schedules`, "POST", createForm);
    setCreateForm(emptyForm(createForm.dayId));
  }

  async function updateSchedule(scheduleId: string) {
    await requestJson(
      `/api/admin/projects/${projectId}/schedules/${scheduleId}`,
      "PATCH",
      editForms[scheduleId],
    );
  }

  async function deleteSchedule(scheduleId: string) {
    await requestJson(`/api/admin/projects/${projectId}/schedules/${scheduleId}`, "DELETE");
  }

  return (
    <div className="space-y-lg">
      <Card className="space-y-md">
        <div>
          <h2 className="text-section-title text-on-surface">세부일정 추가</h2>
          <p className="text-secondary text-on-surface-variant">
            업로더가 사진과 메모를 연결할 기준 일정을 먼저 만듭니다.
          </p>
        </div>
        <div className="grid gap-sm lg:grid-cols-[1fr_120px_1.4fr_1.2fr_1fr_auto]">
          <select
            className={inputClass}
            value={createForm.dayId}
            onChange={(event) => updateCreate("dayId", event.target.value)}
          >
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                Day {day.dayNumber} {day.title ?? ""}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            type="time"
            value={createForm.time}
            onChange={(event) => updateCreate("time", event.target.value)}
          />
          <input
            className={inputClass}
            placeholder="일정 제목"
            value={createForm.title}
            onChange={(event) => updateCreate("title", event.target.value)}
          />
          <input
            className={inputClass}
            placeholder="장소"
            value={createForm.location}
            onChange={(event) => updateCreate("location", event.target.value)}
          />
          <input
            className={inputClass}
            placeholder="카테고리"
            value={createForm.category}
            onChange={(event) => updateCreate("category", event.target.value)}
          />
          <Button disabled={isSubmitting || !createForm.title} onClick={() => run(createSchedule)}>
            추가
          </Button>
        </div>
        {error ? <p className="text-secondary text-error">{error}</p> : null}
      </Card>

      <div className="space-y-md">
        {days.map((day) => (
          <Card key={day.id} className="space-y-md">
            <div className="flex flex-col gap-base sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-metadata text-primary">Day {day.dayNumber}</p>
                <h2 className="text-section-title text-on-surface">{day.title ?? "여행 일정"}</h2>
              </div>
              <p className="text-secondary text-on-surface-variant">
                {new Date(day.date).toLocaleDateString("ko-KR")}
              </p>
            </div>

            {day.schedules.length > 0 ? (
              <div className="space-y-sm">
                {day.schedules.map((schedule) => {
                  const form = editForms[schedule.id] ?? scheduleToForm(day.id, schedule);

                  return (
                    <div
                      key={schedule.id}
                      className="grid gap-sm rounded border border-outline-variant bg-surface-container-lowest p-sm lg:grid-cols-[120px_1.5fr_1.2fr_1fr_auto_auto]"
                    >
                      <input
                        className={inputClass}
                        type="time"
                        value={form.time}
                        onChange={(event) => updateEdit(schedule.id, "time", event.target.value)}
                      />
                      <input
                        className={inputClass}
                        value={form.title}
                        onChange={(event) => updateEdit(schedule.id, "title", event.target.value)}
                      />
                      <input
                        className={inputClass}
                        value={form.location}
                        placeholder="장소"
                        onChange={(event) =>
                          updateEdit(schedule.id, "location", event.target.value)
                        }
                      />
                      <input
                        className={inputClass}
                        value={form.category}
                        placeholder="카테고리"
                        onChange={(event) =>
                          updateEdit(schedule.id, "category", event.target.value)
                        }
                      />
                      <Button
                        variant="secondary"
                        disabled={isSubmitting || !form.title}
                        onClick={() => run(() => updateSchedule(schedule.id))}
                      >
                        저장
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={isSubmitting}
                        onClick={() => run(() => deleteSchedule(schedule.id))}
                      >
                        삭제
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded border border-dashed border-outline-variant p-md text-secondary text-on-surface-variant">
                아직 등록된 세부일정이 없습니다.
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
