import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <AppShell title="설정">
      <div className="max-w-3xl space-y-lg">
        <section className="flex flex-col gap-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">계정 설정</h1>
            <p className="text-secondary text-on-surface-variant">
              로그인 정보와 활성 프로젝트 설정을 관리합니다.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/settings/project">프로젝트 설정</Link>
          </Button>
        </section>

        <AccountSettingsForm
          user={{
            email: currentUser.email,
            name: currentUser.name,
            globalRole: currentUser.globalRole,
          }}
        />
      </div>
    </AppShell>
  );
}
