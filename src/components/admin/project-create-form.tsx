"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ManagerOption = {
  id: string;
  name: string;
  email: string;
};

type ProjectCreateFormProps = {
  managerOptions: ManagerOption[];
};

const inputClass =
  "mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md focus:border-primary focus:outline-none";

export function ProjectCreateForm({ managerOptions }: ProjectCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        orgName: formData.get("orgName"),
        description: formData.get("description"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        managerUserId: formData.get("managerUserId"),
      }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data?.error ?? "프로젝트 생성에 실패했습니다.");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="grid gap-sm" onSubmit={onSubmit}>
      <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
        <p className="text-secondary font-medium text-on-surface">생성 후 자동 적용</p>
        <p className="mt-base text-metadata text-on-surface-variant">
          새 프로젝트를 만들면 슈퍼관리자의 활성 프로젝트가 새 프로젝트로 변경되고, 여행 기간에
          맞춰 Day가 자동 생성됩니다.
        </p>
      </div>

      <label className="block">
        <span className="text-secondary text-on-surface">프로젝트명</span>
        <input className={inputClass} name="name" required />
      </label>
      <label className="block">
        <span className="text-secondary text-on-surface">소속/단체명</span>
        <input className={inputClass} name="orgName" />
      </label>
      <div className="grid gap-sm sm:grid-cols-2">
        <label className="block">
          <span className="text-secondary text-on-surface">시작일</span>
          <input className={inputClass} name="startDate" type="date" required />
        </label>
        <label className="block">
          <span className="text-secondary text-on-surface">종료일</span>
          <input className={inputClass} name="endDate" type="date" required />
        </label>
      </div>
      <label className="block">
        <span className="text-secondary text-on-surface">프로젝트 관리자</span>
        <select className={inputClass} name="managerUserId">
          <option value="">나중에 회원 승인에서 지정</option>
          {managerOptions.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name} / {manager.email}
            </option>
          ))}
        </select>
        <span className="mt-base block text-metadata text-on-surface-variant">
          가입 승인된 회원만 선택할 수 있습니다. 새 회원은 회원 승인 화면에서 먼저 승인해 주세요.
        </span>
      </label>
      <label className="block">
        <span className="text-secondary text-on-surface">설명</span>
        <textarea
          className="mt-xs min-h-24 w-full rounded border border-outline-variant bg-surface-container-lowest px-md py-sm focus:border-primary focus:outline-none"
          name="description"
        />
      </label>
      {error ? <p className="text-secondary text-error">{error}</p> : null}
      <Button disabled={isSubmitting}>
        {isSubmitting ? "생성 중..." : "프로젝트 생성 및 적용"}
      </Button>
    </form>
  );
}
