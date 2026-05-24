import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { StorybookPreview } from "@/components/storybook/storybook-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { getStorybookPreviewData } from "@/lib/storybook/preview-data";

async function canManageStorybook(userId: string, globalRole: string | null, projectId: string) {
  if (globalRole === "super_admin") {
    return true;
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
      role: "project_manager",
      status: "active",
    },
    select: { id: true },
  });

  return Boolean(membership);
}

export default async function AdminStorybookPreviewPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.activeProjectId) {
    redirect("/settings/project");
  }

  const allowed = await canManageStorybook(
    currentUser.id,
    currentUser.globalRole,
    currentUser.activeProjectId,
  );

  if (!allowed) {
    redirect("/forbidden");
  }

  const data = await getStorybookPreviewData(currentUser.activeProjectId);

  return (
    <AppShell title="스토리북 미리보기" section="admin">
      <div className="space-y-lg">
        <Button asChild variant="secondary">
          <Link href="/admin/storybook">
            <ArrowLeft className="h-4 w-4" />
            편집으로 돌아가기
          </Link>
        </Button>

        {data && data.days.length > 0 ? (
          <StorybookPreview
            project={data.project}
            storybook={data.storybook}
            days={data.days}
            modeLabel="승인 전 미리보기"
          />
        ) : (
          <Card>
            <h1 className="text-major-title text-on-surface">미리볼 항목이 없습니다</h1>
            <p className="mt-sm text-secondary text-on-surface-variant">
              스토리북에 포함된 업로드가 생기면 최종 형태를 미리 확인할 수 있습니다.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
