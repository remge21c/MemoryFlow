"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarPlus, Clock, Edit3, MapPin, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

const quickTimeOptions = [
  { label: "시간 없음", value: "" },
  { label: "오전 9시", value: "09:00" },
  { label: "오전 11시", value: "11:00" },
  { label: "점심", value: "12:00" },
  { label: "오후 2시", value: "14:00" },
  { label: "오후 4시", value: "16:00" },
  { label: "저녁", value: "18:00" },
];

async function requestJson(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    redirect: "manual",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.type === "opaqueredirect" || response.status === 0) {
    throw new Error("로그인 상태가 만료되었습니다. 다시 로그인해 주세요.");
  }

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

function scheduleMeta(schedule: Pick<Schedule, "time" | "location" | "category">) {
  const parts = [schedule.time, schedule.location, schedule.category].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "시간과 장소는 나중에 입력해도 됩니다";
}

function QuickTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-xs">
      <p className="text-metadata text-on-surface-variant">빠른 선택</p>
      <div className="flex flex-wrap gap-xs">
        {quickTimeOptions.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "focus-ring min-h-8 rounded border px-sm text-metadata transition-colors",
                isSelected
                  ? "border-primary bg-primary-fixed text-primary"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleManager({ projectId, days }: ScheduleManagerProps) {
  const router = useRouter();
  const firstDayId = days[0]?.id ?? "";
  const [selectedDayId, setSelectedDayId] = useState(firstDayId);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm(firstDayId));
  const [editForms, setEditForms] = useState<Record<string, FormState>>(() =>
    Object.fromEntries(
      days.flatMap((day) =>
        day.schedules.map((schedule) => [schedule.id, scheduleToForm(day.id, schedule)]),
      ),
    ),
  );
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [showCreateDetails, setShowCreateDetails] = useState(false);
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDay = useMemo(
    () => days.find((day) => day.id === selectedDayId) ?? days[0],
    [selectedDayId, days],
  );

  const selectedSchedule = selectedDay?.schedules.find(
    (schedule) => schedule.id === editingScheduleId,
  );

  function selectDay(dayId: string) {
    setSelectedDayId(dayId);
    setCreateForm((current) => ({ ...current, dayId }));
    setEditingScheduleId(null);
    setShowEditDetails(false);
    setError(null);
  }

  function updateCreate(field: keyof FormState, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function updateEdit(scheduleId: string, field: keyof FormState, value: string) {
    setEditForms((current) => ({
      ...current,
      [scheduleId]: { ...current[scheduleId], [field]: value },
    }));
  }

  function startEdit(schedule: Schedule) {
    if (!selectedDay) return;
    setEditingScheduleId(schedule.id);
    setEditForms((current) => ({
      ...current,
      [schedule.id]: current[schedule.id] ?? scheduleToForm(selectedDay.id, schedule),
    }));
    setShowEditDetails(Boolean(schedule.time || schedule.location || schedule.category));
    setError(null);
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
    const form = { ...createForm, dayId: selectedDay.id };
    await requestJson(`/api/admin/projects/${projectId}/schedules`, "POST", form);
    setCreateForm(emptyForm(selectedDay.id));
    setShowCreateDetails(false);
  }

  async function updateSchedule(scheduleId: string) {
    await requestJson(
      `/api/admin/projects/${projectId}/schedules/${scheduleId}`,
      "PATCH",
      editForms[scheduleId],
    );
    setEditingScheduleId(null);
    setShowEditDetails(false);
  }

  async function moveSchedule(scheduleId: string, direction: "up" | "down") {
    await requestJson(
      `/api/admin/projects/${projectId}/schedules/${scheduleId}`,
      "PATCH",
      { direction },
    );
    setEditingScheduleId(null);
    setShowEditDetails(false);
  }

  async function deleteSchedule(scheduleId: string) {
    if (!window.confirm("이 세부일정을 삭제할까요? 업로드가 연결된 일정은 삭제할 수 없습니다.")) {
      return;
    }

    await requestJson(`/api/admin/projects/${projectId}/schedules/${scheduleId}`, "DELETE");
    setEditingScheduleId(null);
  }

  if (!selectedDay) {
    return (
      <Card>
        <p className="text-secondary text-on-surface-variant">
          프로젝트에 생성된 Day가 없습니다. 프로젝트 기간을 먼저 확인해 주세요.
        </p>
      </Card>
    );
  }

  const editingForm =
    selectedSchedule && editingScheduleId
      ? editForms[editingScheduleId] ?? scheduleToForm(selectedDay.id, selectedSchedule)
      : null;

  return (
    <div className="grid gap-lg xl:grid-cols-[320px_1fr]">
      <aside className="space-y-md">
        <Card className="space-y-sm">
          <div className="flex items-start gap-sm">
            <CalendarPlus className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-section-title text-on-surface">Day 선택</h2>
              <p className="mt-xs text-secondary text-on-surface-variant">
                먼저 정리할 Day를 고른 뒤, 그 Day의 세부일정만 추가하거나 수정합니다.
              </p>
            </div>
          </div>
          <div className="space-y-xs">
            {days.map((day) => {
              const isSelected = day.id === selectedDay.id;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => selectDay(day.id)}
                  className={cn(
                    "focus-ring w-full rounded border px-sm py-sm text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary-fixed text-on-primary-fixed"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
                  )}
                >
                  <div className="flex items-center justify-between gap-sm">
                    <span className="text-secondary font-semibold">Day {day.dayNumber}</span>
                    <Badge
                      className={cn(
                        isSelected ? "border-primary bg-surface text-primary" : "",
                        day.schedules.length === 0 && !isSelected ? "border-error text-error" : "",
                      )}
                    >
                      {day.schedules.length === 0 ? "기준 없음" : `${day.schedules.length}개`}
                    </Badge>
                  </div>
                  <p className="mt-base truncate text-secondary">{day.title ?? "여행 일정"}</p>
                  <p className="mt-base text-metadata text-on-surface-variant">
                    {formatDayDate(day.date)}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>
      </aside>

      <section className="space-y-md">
        <Card className="space-y-md">
          <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-xs">
                <Badge className="border-primary text-primary">Day {selectedDay.dayNumber}</Badge>
                <Badge>{formatDayDate(selectedDay.date)}</Badge>
                {selectedDay.schedules.length === 0 ? (
                  <Badge className="border-error text-error">아직 기준 일정 없음</Badge>
                ) : (
                  <Badge>{selectedDay.schedules.length}개 세부일정</Badge>
                )}
              </div>
              <h2 className="mt-sm text-screen-title text-on-surface">
                {selectedDay.title ?? "여행 일정"}
              </h2>
              <p className="mt-xs text-secondary text-on-surface-variant">
                사진과 메모를 담을 기준입니다. 정확한 계획이 아니어도 괜찮고, 여행 중 바뀌면
                이곳에서 다시 고치면 됩니다.
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-md">
          <div className="flex items-start justify-between gap-md">
            <div>
              <h3 className="text-section-title text-on-surface">세부일정 추가</h3>
              <p className="mt-xs text-secondary text-on-surface-variant">
                제목만 입력해도 업로드 분류 기준으로 사용할 수 있습니다.
              </p>
            </div>
            <Plus className="h-5 w-5 text-primary" />
          </div>

          <label className="grid gap-xs">
            <span className="text-metadata text-on-surface-variant">일정 제목</span>
            <input
              className={inputClass}
              placeholder="예: 오래된 찻집"
              value={createForm.dayId === selectedDay.id ? createForm.title : ""}
              onChange={(event) => updateCreate("title", event.target.value)}
            />
          </label>

          <button
            type="button"
            className="text-left text-secondary font-medium text-primary"
            onClick={() => setShowCreateDetails((current) => !current)}
          >
            {showCreateDetails ? "선택 입력 닫기" : "시간·장소·분류 선택 입력"}
          </button>

          {showCreateDetails ? (
            <div className="grid gap-sm md:grid-cols-3">
              <label className="grid gap-xs">
                <span className="text-metadata text-on-surface-variant">시간</span>
                <QuickTimePicker
                  value={createForm.time}
                  onChange={(value) => updateCreate("time", value)}
                />
                <input
                  className={inputClass}
                  type="time"
                  value={createForm.time}
                  onChange={(event) => updateCreate("time", event.target.value)}
                />
              </label>
              <label className="grid gap-xs">
                <span className="text-metadata text-on-surface-variant">장소</span>
                <input
                  className={inputClass}
                  placeholder="예: 은각사 근처"
                  value={createForm.location}
                  onChange={(event) => updateCreate("location", event.target.value)}
                />
              </label>
              <label className="grid gap-xs">
                <span className="text-metadata text-on-surface-variant">분류</span>
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
          ) : null}

          <div className="flex flex-wrap items-center gap-sm">
            <Button
              disabled={isSubmitting || !createForm.title.trim()}
              onClick={() => run(createSchedule)}
            >
              일정 추가
            </Button>
            {error ? <p className="text-secondary text-error">{error}</p> : null}
          </div>
        </Card>

        <Card className="space-y-md">
          <div>
            <h3 className="text-section-title text-on-surface">세부일정</h3>
            <p className="mt-xs text-secondary text-on-surface-variant">
              평소에는 목록만 보고, 수정이 필요할 때만 항목을 열어 고칩니다.
            </p>
          </div>

          {selectedDay.schedules.length > 0 ? (
            <div className="space-y-sm">
              {selectedDay.schedules.map((schedule, index) => {
                const isEditing = schedule.id === editingScheduleId;
                const isFirst = index === 0;
                const isLast = index === selectedDay.schedules.length - 1;

                return (
                  <div
                    key={schedule.id}
                    className="rounded border border-outline-variant bg-surface-container-lowest"
                  >
                    <div className="flex flex-col gap-sm p-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-xs">
                          <Badge>#{index + 1}</Badge>
                          {schedule.time ? (
                            <Badge className="gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {schedule.time}
                            </Badge>
                          ) : null}
                          {schedule.category ? <Badge>{schedule.category}</Badge> : null}
                        </div>
                        <p className="mt-xs truncate text-section-title text-on-surface">
                          {schedule.title}
                        </p>
                        <p className="mt-base truncate text-secondary text-on-surface-variant">
                          {scheduleMeta(schedule)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-xs">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isSubmitting || isFirst}
                          onClick={() => run(() => moveSchedule(schedule.id, "up"))}
                          aria-label={`${schedule.title} 위로 이동`}
                          title="위로"
                        >
                          <ArrowUp className="h-4 w-4" />
                          위로
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isSubmitting || isLast}
                          onClick={() => run(() => moveSchedule(schedule.id, "down"))}
                          aria-label={`${schedule.title} 아래로 이동`}
                          title="아래로"
                        >
                          <ArrowDown className="h-4 w-4" />
                          아래로
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(schedule)}
                        >
                          <Edit3 className="h-4 w-4" />
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSubmitting}
                          onClick={() => run(() => deleteSchedule(schedule.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                          삭제
                        </Button>
                      </div>
                    </div>

                    {isEditing && editingForm ? (
                      <div className="space-y-sm border-t border-outline-variant p-sm">
                        <label className="grid gap-xs">
                          <span className="text-metadata text-on-surface-variant">일정 제목</span>
                          <input
                            className={inputClass}
                            value={editingForm.title}
                            onChange={(event) =>
                              updateEdit(schedule.id, "title", event.target.value)
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="text-left text-secondary font-medium text-primary"
                          onClick={() => setShowEditDetails((current) => !current)}
                        >
                          {showEditDetails ? "선택 입력 닫기" : "시간·장소·분류 선택 입력"}
                        </button>
                        {showEditDetails ? (
                          <div className="grid gap-sm md:grid-cols-3">
                            <label className="grid gap-xs">
                              <span className="text-metadata text-on-surface-variant">시간</span>
                              <QuickTimePicker
                                value={editingForm.time}
                                onChange={(value) => updateEdit(schedule.id, "time", value)}
                              />
                              <input
                                className={inputClass}
                                type="time"
                                value={editingForm.time}
                                onChange={(event) =>
                                  updateEdit(schedule.id, "time", event.target.value)
                                }
                              />
                            </label>
                            <label className="grid gap-xs">
                              <span className="text-metadata text-on-surface-variant">장소</span>
                              <div className="relative">
                                <MapPin className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                                <input
                                  className={`${inputClass} w-full pl-8`}
                                  placeholder="예: 은각사 근처"
                                  value={editingForm.location}
                                  onChange={(event) =>
                                    updateEdit(schedule.id, "location", event.target.value)
                                  }
                                />
                              </div>
                            </label>
                            <label className="grid gap-xs">
                              <span className="text-metadata text-on-surface-variant">분류</span>
                              <select
                                className={inputClass}
                                value={editingForm.category}
                                onChange={(event) =>
                                  updateEdit(schedule.id, "category", event.target.value)
                                }
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
                        ) : null}
                        <div className="flex flex-wrap gap-xs">
                          <Button
                            size="sm"
                            disabled={isSubmitting || !editingForm.title.trim()}
                            onClick={() => run(() => updateSchedule(schedule.id))}
                          >
                            저장
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingScheduleId(null);
                              setShowEditDetails(false);
                            }}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded border border-dashed border-outline-variant p-md">
              <p className="text-secondary text-on-surface-variant">
                아직 등록된 세부일정이 없습니다. 여행 중 사진을 묶을 기준이 생기면 위에서
                제목만 먼저 추가해 주세요.
              </p>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
