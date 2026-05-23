"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProjectCreateForm() {
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
      <label className="block">
        <span className="text-secondary text-on-surface">프로젝트명</span>
        <input
          className="mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md focus:border-primary focus:outline-none"
          name="name"
          required
        />
      </label>
      <label className="block">
        <span className="text-secondary text-on-surface">소속/단체명</span>
        <input
          className="mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md focus:border-primary focus:outline-none"
          name="orgName"
        />
      </label>
      <div className="grid gap-sm sm:grid-cols-2">
        <label className="block">
          <span className="text-secondary text-on-surface">시작일</span>
          <input
            className="mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md focus:border-primary focus:outline-none"
            name="startDate"
            type="date"
            required
          />
        </label>
        <label className="block">
          <span className="text-secondary text-on-surface">종료일</span>
          <input
            className="mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md focus:border-primary focus:outline-none"
            name="endDate"
            type="date"
            required
          />
        </label>
      </div>
      <label className="block">
        <span className="text-secondary text-on-surface">설명</span>
        <textarea
          className="mt-xs min-h-24 w-full rounded border border-outline-variant bg-surface-container-lowest px-md py-sm focus:border-primary focus:outline-none"
          name="description"
        />
      </label>
      {error ? <p className="text-secondary text-error">{error}</p> : null}
      <Button disabled={isSubmitting}>{isSubmitting ? "생성 중..." : "프로젝트 생성"}</Button>
    </form>
  );
}
