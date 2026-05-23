"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Project = {
  id: string;
  name: string;
};

type MemberActionsProps = {
  userId: string;
  status: string;
  projects: Project[];
};

async function postAction(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "요청 처리에 실패했습니다.");
  }
}

export function MemberActions({ userId, status, projects }: MemberActionsProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [role, setRole] = useState<"project_manager" | "uploader">("uploader");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="space-y-sm">
      <div className="flex flex-wrap gap-xs">
        {status !== "active" ? (
          <Button
            size="sm"
            disabled={isSubmitting}
            onClick={() => run(() => postAction(`/api/admin/users/${userId}/approve`))}
          >
            승인
          </Button>
        ) : null}
        {status !== "rejected" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => run(() => postAction(`/api/admin/users/${userId}/reject`))}
          >
            거절
          </Button>
        ) : null}
        {status !== "inactive" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => run(() => postAction(`/api/admin/users/${userId}/deactivate`))}
          >
            비활성화
          </Button>
        ) : null}
      </div>

      <div className="grid gap-xs">
        <select
          className="h-9 rounded border border-outline-variant bg-surface-container-lowest px-sm text-secondary focus:border-primary focus:outline-none"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          disabled={projects.length === 0 || isSubmitting}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded border border-outline-variant bg-surface-container-lowest px-sm text-secondary focus:border-primary focus:outline-none"
          value={role}
          onChange={(event) => setRole(event.target.value as "project_manager" | "uploader")}
          disabled={isSubmitting}
        >
          <option value="uploader">업로더</option>
          <option value="project_manager">프로젝트 관리자</option>
        </select>
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={!projectId || isSubmitting}
          onClick={() =>
            run(() =>
              postAction(`/api/admin/users/${userId}/project-members`, {
                projectId,
                role,
              }),
            )
          }
        >
          역할 배정
        </Button>
      </div>

      {error ? <p className="text-metadata text-error">{error}</p> : null}
    </div>
  );
}
