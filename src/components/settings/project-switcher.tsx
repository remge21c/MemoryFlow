"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, CalendarDays, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  orgName: string | null;
  startDate: string;
  endDate: string;
  members: { role: string }[];
  _count: { days: number; schedules: number; uploads: number };
  storybook: { status: string; approvedAt: string | null } | null;
};

type ProjectSwitcherProps = {
  activeProjectId: string | null;
  projects: Project[];
};

const roleLabel: Record<string, string> = {
  project_manager: "프로젝트 관리자",
  uploader: "업로더",
};

const storybookLabel: Record<string, string> = {
  draft: "스토리북 정리 중",
  approved: "스토리북 승인 완료",
};

export function ProjectSwitcher({ activeProjectId, projects }: ProjectSwitcherProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectProject(projectId: string) {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/projects/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "활성 프로젝트 변경에 실패했습니다.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "활성 프로젝트 변경에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-md">
      {projects.map((project) => {
        const isActive = project.id === activeProjectId;
        const role = project.members[0]?.role;

        return (
          <Card
            key={project.id}
            className={cn(
              "transition-colors",
              isActive ? "border-primary bg-primary-fixed/30" : "",
            )}
          >
            <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-xs">
                  {isActive ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                  <h2 className="korean-text text-section-title text-on-surface">
                    {project.name}
                  </h2>
                  {isActive ? (
                    <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
                      현재 활성
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-xs text-secondary text-on-surface-variant">
                  {project.orgName ?? "소속 없음"} / {formatDate(project.startDate)} -{" "}
                  {formatDate(project.endDate)}
                </p>
                <div className="mt-sm flex flex-wrap gap-xs">
                  <Badge className="border-primary text-primary">
                    {role ? roleLabel[role] : "슈퍼관리자"}
                  </Badge>
                  <Badge>{project.storybook ? storybookLabel[project.storybook.status] ?? project.storybook.status : "스토리북 없음"}</Badge>
                </div>
                <div className="mt-sm grid gap-xs text-metadata text-on-surface-variant sm:grid-cols-3">
                  <span className="inline-flex items-center gap-xs">
                    <CalendarDays className="h-4 w-4" />
                    Day {project._count.days}
                  </span>
                  <span className="inline-flex items-center gap-xs">
                    <BookOpen className="h-4 w-4" />
                    세부일정 {project._count.schedules}
                  </span>
                  <span className="inline-flex items-center gap-xs">
                    <ImageIcon className="h-4 w-4" />
                    업로드 {project._count.uploads}
                  </span>
                </div>
              </div>
              <Button
                variant={isActive ? "secondary" : "primary"}
                disabled={isSubmitting || isActive}
                onClick={() => selectProject(project.id)}
              >
                {isActive ? "현재 프로젝트" : "이 프로젝트 적용"}
              </Button>
            </div>
          </Card>
        );
      })}
      {projects.length === 0 ? (
        <Card>
          <p className="text-secondary text-on-surface-variant">
            아직 참여 중인 프로젝트가 없습니다.
          </p>
        </Card>
      ) : null}
      {error ? <p className="text-secondary text-error">{error}</p> : null}
    </div>
  );
}
