"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProjectStatusActions({
  projectId,
  status,
}: {
  projectId: string;
  status: "active" | "completed" | "archived";
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updateStatus(nextStatus: "active" | "completed" | "archived") {
    setIsSubmitting(true);
    await fetch(`/api/admin/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-xs">
      {status !== "active" ? (
        <Button size="sm" variant="secondary" disabled={isSubmitting} onClick={() => updateStatus("active")}>
          활성화
        </Button>
      ) : null}
      {status !== "completed" ? (
        <Button size="sm" variant="secondary" disabled={isSubmitting} onClick={() => updateStatus("completed")}>
          완료
        </Button>
      ) : null}
      {status !== "archived" ? (
        <Button size="sm" variant="secondary" disabled={isSubmitting} onClick={() => updateStatus("archived")}>
          보관
        </Button>
      ) : null}
    </div>
  );
}
