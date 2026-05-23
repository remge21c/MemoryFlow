import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <AppShell title="설정">
      <div className="max-w-3xl space-y-md">
        <h1 className="text-major-title text-on-surface">프로필 설정</h1>
        <Card>
          <p className="text-section-title text-on-surface">슈퍼 관리자</p>
          <p className="mt-xs text-secondary text-on-surface-variant">admin@memoryflow.local</p>
        </Card>
      </div>
    </AppShell>
  );
}
