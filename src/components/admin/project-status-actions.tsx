"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ProjectStatus = "active" | "completed" | "archived";

export function ProjectStatusActions({
  projectId,
  status,
  isActiveProject,
}: {
  projectId: string;
  status: ProjectStatus;
  isActiveProject: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function request(url: string, method: "PATCH", body: unknown) {
    setError(null);
    setIsSubmitting(true);
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setIsSubmitting(false);

    if (!response.ok) {
      setError(data?.error ?? "요청 처리에 실패했습니다.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-xs">
      <div className="flex flex-wrap justify-start gap-xs lg:justify-end">
        {!isActiveProject ? (
          <Button
            size="sm"
            disabled={isSubmitting}
            onClick={() => request("/api/projects/active", "PATCH", { projectId })}
          >
            이 프로젝트 적용
          </Button>
        ) : null}
        {status !== "active" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => request(`/api/admin/projects/${projectId}`, "PATCH", { status: "active" })}
          >
            진행 중
          </Button>
        ) : null}
        {status !== "completed" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() =>
              request(`/api/admin/projects/${projectId}`, "PATCH", { status: "completed" })
            }
          >
            완료
          </Button>
        ) : null}
        {status !== "archived" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() =>
              request(`/api/admin/projects/${projectId}`, "PATCH", { status: "archived" })
            }
          >
            보관
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-metadata text-error lg:text-right">{error}</p> : null}
    </div>
  );
}
