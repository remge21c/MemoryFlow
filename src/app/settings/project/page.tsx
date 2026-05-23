import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { activeProject } from "@/lib/mock-data";

export default function ProjectSettingsPage() {
  return (
    <AppShell title="프로젝트 설정">
      <div className="max-w-3xl space-y-lg">
        <div>
          <h1 className="text-major-title text-on-surface">활성 프로젝트</h1>
          <p className="text-secondary text-on-surface-variant">
            프로젝트 전환은 이 페이지에서만 가능합니다.
          </p>
        </div>
        <Card className="border-primary bg-primary-fixed/30">
          <div className="flex items-start justify-between gap-md">
            <div>
              <p className="text-section-title text-on-surface">{activeProject.name}</p>
              <p className="mt-xs text-secondary text-on-surface-variant">{activeProject.period}</p>
              <p className="mt-base text-metadata text-primary">{activeProject.orgName}</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <Button className="mt-md" variant="secondary">
            현재 프로젝트
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
