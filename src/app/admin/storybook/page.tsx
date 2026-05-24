import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, Image as ImageIcon, Link2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import {
  StorybookEditor,
  type AiReviewResult,
} from "@/components/admin/storybook-editor";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

function canManageStorybook(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  memberships: { userId: string; role: string; status: string }[],
) {
  if (!user) return false;
  if (user.globalRole === "super_admin") return true;
  return memberships.some(
    (membership) =>
      membership.userId === user.id &&
      membership.role === "project_manager" &&
      membership.status === "active",
  );
}

export default async function AdminStorybookPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.activeProjectId) {
    redirect("/settings/project");
  }

  const project = await prisma.project.findUnique({
    where: { id: currentUser.activeProjectId },
    include: {
      members: {
        where: { status: "active" },
        select: { userId: true, role: true, status: true },
      },
      storybook: {
        select: {
          status: true,
          title: true,
          openingText: true,
          closingText: true,
          approvedAt: true,
        },
      },
      days: {
        orderBy: { sortOrder: "asc" },
        include: {
          schedules: {
            orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
            include: {
              uploads: {
                where: { deletedAt: null },
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                include: {
                  user: { select: { name: true } },
                  files: {
                    select: { id: true, fileType: true, mimeType: true },
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      },
      shareLinks: {
        where: { type: "storybook" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
          disabledAt: true,
          creator: { select: { name: true } },
        },
      },
      aiJobs: {
        where: {
          type: "storybook_review",
          status: "completed",
        },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: {
          model: true,
          resultJson: true,
          completedAt: true,
        },
      },
    },
  });

  if (!project || !canManageStorybook(currentUser, project.members)) {
    redirect("/forbidden");
  }

  const storybook = project.storybook ?? {
    status: "draft" as const,
    title: null,
    openingText: null,
    closingText: null,
    approvedAt: null,
  };

  const serializedDays = project.days.map((day) => ({
    id: day.id,
    dayNumber: day.dayNumber,
    title: day.title,
    schedules: day.schedules.map((schedule) => ({
      id: schedule.id,
      time: schedule.time,
      title: schedule.title,
      location: schedule.location,
      uploads: schedule.uploads.map((upload) => ({
        id: upload.id,
        type: upload.type,
        memo: upload.memo,
        isInStorybook: upload.isInStorybook,
        adminNote: upload.adminNote,
        sortOrder: upload.sortOrder,
        user: upload.user,
        files: upload.files,
      })),
    })),
  }));

  const uploads = serializedDays.flatMap((day) =>
    day.schedules.flatMap((schedule) => schedule.uploads),
  );
  const includedCount = uploads.filter((upload) => upload.isInStorybook).length;
  const activeShareLinks = project.shareLinks.filter(
    (shareLink) => shareLink.isActive && shareLink.expiresAt.getTime() > Date.now(),
  ).length;
  const latestAiReview = project.aiJobs[0];

  return (
    <AppShell title="스토리북 승인" section="admin">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">스토리북 편집/승인</h1>
            <p className="text-secondary text-on-surface-variant">
              업로드된 기록을 최종 스토리북으로 정리하고 공유 링크 발급 전 상태를 검토합니다.
            </p>
          </div>
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            {project.name}
          </Badge>
        </section>

        <section className="grid gap-md md:grid-cols-4">
          <Card>
            <BookOpen className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">승인 상태</p>
            <p className="text-section-title text-on-surface">
              {storybook.status === "approved" ? "승인 완료" : "초안"}
            </p>
          </Card>
          <Card>
            <ImageIcon className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">전체 업로드</p>
            <p className="text-section-title text-on-surface">{uploads.length}개</p>
          </Card>
          <Card>
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">스토리북 포함</p>
            <p className="text-section-title text-on-surface">{includedCount}개</p>
          </Card>
          <Card>
            <Link2 className="h-5 w-5 text-primary" />
            <p className="mt-xs text-metadata text-on-surface-variant">활성 공유 링크</p>
            <p className="text-section-title text-on-surface">{activeShareLinks}개</p>
          </Card>
        </section>

        {uploads.length > 0 ? (
          <StorybookEditor
            projectId={project.id}
            isSuperAdmin={currentUser.globalRole === "super_admin"}
            storybook={{
              ...storybook,
              approvedAt: storybook.approvedAt?.toISOString() ?? null,
            }}
            days={serializedDays}
            initialAiReview={
              latestAiReview
                ? {
                    model: latestAiReview.model,
                    completedAt: latestAiReview.completedAt?.toISOString() ?? null,
                    result: latestAiReview.resultJson as AiReviewResult,
                  }
                : null
            }
            shareLinks={project.shareLinks.map((shareLink) => ({
              ...shareLink,
              expiresAt: shareLink.expiresAt.toISOString(),
              createdAt: shareLink.createdAt.toISOString(),
              disabledAt: shareLink.disabledAt?.toISOString() ?? null,
            }))}
          />
        ) : (
          <Card>
            <h2 className="text-section-title text-on-surface">아직 정리할 업로드가 없습니다</h2>
            <p className="mt-sm text-secondary text-on-surface-variant">
              업로더가 사진이나 영상을 올리면 이 화면에서 포함 여부, 순서, 캡션을 정리하고 최종
              승인할 수 있습니다.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
