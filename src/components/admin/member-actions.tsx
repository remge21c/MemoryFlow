"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Project = {
  id: string;
  name: string;
};

type Membership = {
  id: string;
  role: "project_manager" | "uploader";
  project: {
    id: string;
    name: string;
  };
};

type MemberActionsProps = {
  userId: string;
  status: string;
  projects: Project[];
  memberships: Membership[];
  isCurrentUser: boolean;
};

async function requestAction(url: string, method: "DELETE" | "POST", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "요청 처리에 실패했습니다.");
  }
}

async function postAction(url: string, body?: unknown) {
  return requestAction(url, "POST", body);
}

async function deleteAction(url: string, body?: unknown) {
  return requestAction(url, "DELETE", body);
}

export function MemberActions({
  userId,
  status,
  projects,
  memberships,
  isCurrentUser,
}: MemberActionsProps) {
  const router = useRouter();
  const firstMembership = memberships[0];
  const [projectId, setProjectId] = useState(firstMembership?.project.id ?? projects[0]?.id ?? "");
  const [role, setRole] = useState<"project_manager" | "uploader">(
    firstMembership?.role ?? "uploader",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedMembership = memberships.find((membership) => membership.project.id === projectId);

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

  const projectControls = (
    <div className="grid gap-sm">
      <label className="grid gap-xs">
        <span className="text-metadata text-on-surface-variant">프로젝트</span>
        <select
          className="h-10 rounded border border-outline-variant bg-surface-container-lowest px-sm text-secondary focus:border-primary focus:outline-none"
          value={projectId}
          onChange={(event) => {
            const nextProjectId = event.target.value;
            const nextMembership = memberships.find(
              (membership) => membership.project.id === nextProjectId,
            );
            setProjectId(nextProjectId);
            setRole(nextMembership?.role ?? "uploader");
          }}
          disabled={projects.length === 0 || isSubmitting}
        >
          {projects.length === 0 ? <option value="">등록된 프로젝트 없음</option> : null}
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-xs">
        <span className="text-metadata text-on-surface-variant">프로젝트 역할</span>
        <select
          className="h-10 rounded border border-outline-variant bg-surface-container-lowest px-sm text-secondary focus:border-primary focus:outline-none"
          value={role}
          onChange={(event) => setRole(event.target.value as "project_manager" | "uploader")}
          disabled={isSubmitting}
        >
          <option value="uploader">업로더</option>
          <option value="project_manager">프로젝트 관리자</option>
        </select>
      </label>
      <p className="text-metadata text-on-surface-variant">
        {selectedMembership ? "이미 배정된 프로젝트입니다. 저장하면 역할이 변경됩니다." : "새 프로젝트 배정입니다."}
      </p>
    </div>
  );

  return (
    <div className="space-y-sm">
      {status === "pending" ? (
        <div className="space-y-sm rounded border border-primary/50 bg-primary-fixed/20 p-sm">
          <p className="text-secondary font-medium text-on-surface">승인 전 확인</p>
          <p className="text-metadata text-on-surface-variant">
            가입자를 활성화하려면 프로젝트와 역할을 먼저 지정해야 합니다.
          </p>
          {projectControls}
          <Button
            size="sm"
            className="w-full"
            disabled={!projectId || projects.length === 0 || isSubmitting}
            onClick={() =>
              run(() =>
                postAction(`/api/admin/users/${userId}/approve`, {
                  projectId,
                  role,
                }),
              )
            }
          >
            {isSubmitting ? "처리 중..." : "승인하고 역할 배정"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={isSubmitting}
            onClick={() => run(() => postAction(`/api/admin/users/${userId}/reject`))}
          >
            가입 거절
          </Button>
          {projects.length === 0 ? (
            <p className="text-metadata text-error">
              프로젝트가 없어 승인할 수 없습니다. 프로젝트 관리에서 먼저 프로젝트를 생성해 주세요.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="space-y-xs rounded border border-outline-variant bg-surface-container-lowest p-sm">
            <p className="text-secondary font-medium text-on-surface">계정 상태</p>
            <div className="flex flex-wrap gap-xs">
            {status !== "active" ? (
              <Button
                size="sm"
                disabled={isSubmitting || (memberships.length === 0 && !projectId)}
                onClick={() =>
                  run(() =>
                    postAction(
                      `/api/admin/users/${userId}/approve`,
                      memberships.length === 0 && projectId ? { projectId, role } : undefined,
                    ),
                  )
                }
              >
                활성화
              </Button>
            ) : null}
            {status !== "rejected" && !isCurrentUser ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => run(() => postAction(`/api/admin/users/${userId}/reject`))}
              >
                거절
              </Button>
            ) : null}
            {status !== "inactive" && !isCurrentUser ? (
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
            {status !== "active" && memberships.length === 0 ? (
              <p className="text-metadata text-on-surface-variant">
                프로젝트 배정이 없는 계정은 아래 프로젝트와 역할을 선택한 뒤 활성화됩니다.
              </p>
            ) : null}
          </div>

          <div className="space-y-sm rounded border border-outline-variant p-sm">
            <p className="text-secondary font-medium text-on-surface">프로젝트 역할 관리</p>
            {projectControls}
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={!projectId || projects.length === 0 || isSubmitting}
              onClick={() =>
                run(() =>
                  postAction(`/api/admin/users/${userId}/project-members`, {
                    projectId,
                    role,
                  }),
                )
              }
            >
              {selectedMembership ? "역할 변경 저장" : "프로젝트에 추가"}
            </Button>
            {selectedMembership ? (
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                disabled={isSubmitting || isCurrentUser}
                onClick={() =>
                  run(() =>
                    deleteAction(`/api/admin/users/${userId}/project-members`, {
                      projectId,
                    }),
                  )
                }
              >
                프로젝트에서 해제
              </Button>
            ) : null}
          </div>
        </>
      )}

      {isCurrentUser ? (
        <p className="text-metadata text-on-surface-variant">
          내 계정의 비활성화/거절 처리는 제한됩니다.
        </p>
      ) : null}
      {error ? <p className="text-metadata text-error">{error}</p> : null}
    </div>
  );
}
