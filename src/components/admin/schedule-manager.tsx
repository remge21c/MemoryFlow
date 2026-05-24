"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, MapPin, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

const categoryOptions = ["이동", "관광", "식사", "예배", "휴식", "기타"];

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

function formatDayDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function ScheduleManager({ projectId, days }: ScheduleManagerProps) {
  const router = useRouter();
  const firstEmptyDay = days.find((day) => day.schedules.length === 0);
  const [createForm, setCreateForm] = useState<FormState>(
    emptyForm(firstEmptyDay?.id ?? days[0]?.id ?? ""),
  );
  const [editForms, setEditForms] = useState<Record<string, FormState>>(() =>
    Object.fromEntries(
      days.flatMap((day) =>
        day.schedules.map((schedule) => [schedule.id, scheduleToForm(day.id, schedule)]),
      ),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDay = useMemo(
    () => days.find((day) => day.id === createForm.dayId) ?? days[0],
    [createForm.dayId, days],
  );

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
    <div className="grid gap-lg xl:grid-cols-[380px_1fr]">
      <aside className="space-y-md">
        <Card className="space-y-md">
          <div className="flex items-start gap-sm">
            <CalendarPlus className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-section-title text-on-surface">세부일정 추가</h2>
              <p className="mt-xs text-secondary text-on-surface-variant">
                사진과 메모가 연결될 기준 일정을 먼저 만듭니다.
              </p>
            </div>
          </div>

          <label className="grid gap-xs">
            <span className="text-metadata text-on-surface-variant">Day 선택</span>
            <select
              className={inputClass}
              value={createForm.dayId}
              onChange={(event) => updateCreate("dayId", event.target.value)}
            >
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  Day {day.dayNumber} · {formatDayDate(day.date)}
                  {day.title ? ` · ${day.title}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-sm sm:grid-cols-2 xl:grid-cols-1">
            <label className="grid gap-xs">
              <span className="text-metadata text-on-surface-variant">시간</span>
              <input
                className={inputClass}
                type="time"
                value={createForm.time}
                onChange={(event) => updateCreate("time", event.target.value)}
              />
            </label>
            <label className="grid gap-xs">
              <span className="text-metadata text-on-surface-variant">카테고리</span>
              <select
                className={inputClass}
                value={createForm.category}
                onChange={(event) => updateCreate("category", event.target.value)}
              >
                <option value="">선택 안 함</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-xs">
            <span className="text-metadata text-on-surface-variant">일정 제목</span>
            <input
              className={inputClass}
              placeholder="예: 성산일출봉 탐방"
              value={createForm.title}
              onChange={(event) => updateCreate("title", event.target.value)}
            />
          </label>

          <label className="grid gap-xs">
            <span className="text-metadata text-on-surface-variant">장소</span>
            <input
              className={inputClass}
              placeholder="예: 성산일출봉"
              value={createForm.location}
              onChange={(event) => updateCreate("location", event.target.value)}
            />
          </label>

          <Button
            disabled={isSubmitting || !createForm.dayId || !createForm.title}
            onClick={() => run(createSchedule)}
          >
            일정 추가
          </Button>
          {error ? <p className="text-secondary text-error">{error}</p> : null}
        </Card>

        {selectedDay ? (
          <Card>
            <p className="text-metadata text-primary">현재 추가 대상</p>
            <h3 className="mt-xs text-section-title text-on-surface">
              Day {selectedDay.dayNumber} {selectedDay.title ?? ""}
            </h3>
            <p className="mt-base text-secondary text-on-surface-variant">
              {formatDayDate(selectedDay.date)} · 세부일정 {selectedDay.schedules.length}개
            </p>
          </Card>
        ) : null}
      </aside>

      <section className="space-y-md">
        {days.map((day) => (
          <Card key={day.id} className="space-y-md">
            <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-xs">
                  <Badge className="border-primary text-primary">Day {day.dayNumber}</Badge>
                  {day.schedules.length === 0 ? (
                    <Badge className="border-error text-error">일정 없음</Badge>
                  ) : (
                    <Badge>{day.schedules.length}개 일정</Badge>
                  )}
                </div>
                <h2 className="mt-sm text-section-title text-on-surface">
                  {day.title ?? "여행 일정"}
                </h2>
                <p className="mt-base text-secondary text-on-surface-variant">
                  {formatDayDate(day.date)}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => updateCreate("dayId", day.id)}
              >
                이 Day에 추가
              </Button>
            </div>

            {day.schedules.length > 0 ? (
              <div className="space-y-sm">
                {day.schedules.map((schedule) => {
                  const form = editForms[schedule.id] ?? scheduleToForm(day.id, schedule);

                  return (
                    <div
                      key={schedule.id}
                      className="grid gap-sm rounded border border-outline-variant bg-surface-container-lowest p-sm lg:grid-cols-[96px_1.35fr_1fr_120px_auto_auto]"
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
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                        <input
                          className={`${inputClass} w-full pl-8`}
                          value={form.location}
                          placeholder="장소"
                          onChange={(event) =>
                            updateEdit(schedule.id, "location", event.target.value)
                          }
                        />
                      </div>
                      <select
                        className={inputClass}
                        value={form.category}
                        onChange={(event) =>
                          updateEdit(schedule.id, "category", event.target.value)
                        }
                      >
                        <option value="">분류 없음</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
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
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-dashed border-outline-variant p-md">
                <p className="text-secondary text-on-surface-variant">
                  아직 등록된 세부일정이 없습니다. 왼쪽 입력 영역에서 이 Day를 선택해 일정을
                  추가해 주세요.
                </p>
              </div>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
