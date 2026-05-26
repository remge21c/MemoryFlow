"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ManagerOption = {
  id: string;
  name: string;
  email: string;
};

type ProjectEditPanelProps = {
  project: {
    id: string;
    name: string;
    orgName: string | null;
    description: string | null;
    startDate: string;
    endDate: string;
    status: "active" | "completed" | "archived";
    managerUserId: string | null;
  };
  managerOptions: ManagerOption[];
};

const inputClass =
  "mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md focus:border-primary focus:outline-none";

const statusOptions = [
  { label: "진행 중", value: "active" },
  { label: "완료", value: "completed" },
  { label: "보관", value: "archived" },
] as const;

export function ProjectEditPanel({ project, managerOptions }: ProjectEditPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        orgName: formData.get("orgName"),
        description: formData.get("description"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        status: formData.get("status"),
        managerUserId: formData.get("managerUserId"),
      }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data?.error ?? "프로젝트 수정에 실패했습니다.");
      return;
    }

    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-sm">
      <Button
        size="sm"
        variant="secondary"
        type="button"
        className="gap-xs"
        onClick={() => {
          setIsOpen((current) => !current);
          setError(null);
        }}
      >
        <Edit3 className="h-4 w-4" />
        {isOpen ? "수정 닫기" : "수정"}
      </Button>

      {isOpen ? (
        <form
          className="grid gap-sm rounded border border-outline-variant bg-surface-container-lowest p-md"
          onSubmit={onSubmit}
        >
          <div className="grid gap-sm md:grid-cols-2">
            <label className="block">
              <span className="text-secondary text-on-surface">프로젝트명</span>
              <input className={inputClass} name="name" defaultValue={project.name} required />
            </label>
            <label className="block">
              <span className="text-secondary text-on-surface">소속/단체명</span>
              <input className={inputClass} name="orgName" defaultValue={project.orgName ?? ""} />
            </label>
          </div>

          <div className="grid gap-sm md:grid-cols-3">
            <label className="block">
              <span className="text-secondary text-on-surface">시작일</span>
              <input
                className={inputClass}
                name="startDate"
                type="date"
                defaultValue={project.startDate}
                required
              />
            </label>
            <label className="block">
              <span className="text-secondary text-on-surface">종료일</span>
              <input
                className={inputClass}
                name="endDate"
                type="date"
                defaultValue={project.endDate}
                required
              />
            </label>
            <label className="block">
              <span className="text-secondary text-on-surface">상태</span>
              <select className={inputClass} name="status" defaultValue={project.status}>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-secondary text-on-surface">프로젝트 관리자</span>
            <select
              className={inputClass}
              name="managerUserId"
              defaultValue={project.managerUserId ?? "__none__"}
            >
              <option value="__none__">관리자 미지정</option>
              {managerOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} / {manager.email}
                </option>
              ))}
            </select>
            <span className="mt-base block text-metadata text-on-surface-variant">
              슈퍼관리자 본인 권한은 유지됩니다. 여기서는 현장 담당 프로젝트 관리자만 지정합니다.
            </span>
          </label>

          <label className="block">
            <span className="text-secondary text-on-surface">설명</span>
            <textarea
              className="mt-xs min-h-24 w-full rounded border border-outline-variant bg-surface-container-lowest px-md py-sm focus:border-primary focus:outline-none"
              name="description"
              defaultValue={project.description ?? ""}
            />
          </label>

          <div className="rounded border border-outline-variant bg-surface-container-low p-sm">
            <p className="text-metadata text-on-surface-variant">
              기간을 늘리면 Day가 자동 추가됩니다. 기간을 줄일 때 삭제 대상 Day에 일정이나 업로드가
              있으면 안전을 위해 저장되지 않습니다.
            </p>
          </div>

          {error ? <p className="text-secondary text-error">{error}</p> : null}

          <div className="flex flex-wrap gap-xs">
            <Button disabled={isSubmitting}>{isSubmitting ? "저장 중..." : "프로젝트 저장"}</Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
            >
              취소
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
