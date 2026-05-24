import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-md text-on-background">
      <Card className="max-w-xl p-lg text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-error-container text-on-error-container">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-md text-major-title text-on-surface">접근 권한이 없습니다</h1>
        <p className="mt-sm text-secondary text-on-surface-variant">
          현재 계정으로는 이 관리자 기능을 사용할 수 없습니다. 필요한 경우 슈퍼관리자에게
          프로젝트 역할을 요청해 주세요.
        </p>
        <div className="mt-lg flex flex-col gap-sm sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">대시보드로 이동</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/settings/project">프로젝트 설정</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
