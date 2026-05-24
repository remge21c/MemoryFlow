import { AppShell } from "@/components/app/app-shell";
import { StorybookPreview } from "@/components/storybook/storybook-preview";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStorybookPreviewData } from "@/lib/storybook/preview-data";

export default async function StorybookPage() {
  const currentUser = await getCurrentUser();
  const data = currentUser?.activeProjectId
    ? await getStorybookPreviewData(currentUser.activeProjectId)
    : null;

  return (
    <AppShell title="스토리북">
      {data && data.days.length > 0 ? (
        <StorybookPreview
          project={data.project}
          storybook={data.storybook}
          days={data.days}
          modeLabel={data.storybook?.status === "approved" ? "승인 완료" : "승인 준비 중"}
        />
      ) : (
        <Card>
          <h1 className="text-major-title text-on-surface">스토리북 항목이 없습니다</h1>
          <p className="mt-sm text-secondary text-on-surface-variant">
            활성 프로젝트를 선택하거나 스토리북에 포함된 업로드가 생기면 이곳에서 볼 수
            있습니다.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
