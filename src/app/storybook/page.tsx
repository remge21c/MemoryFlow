import { BookOpen, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { timelineDays, uploads } from "@/lib/mock-data";

export default function StorybookPage() {
  return (
    <AppShell title="스토리북">
      <article className="mx-auto max-w-4xl space-y-xl">
        <header className="space-y-sm">
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            승인 준비 중
          </Badge>
          <h1 className="korean-text text-major-title text-on-surface">
            비 오는 교토에서 완성된 4일의 이야기
          </h1>
          <p className="text-body text-on-surface-variant">
            가족과 함께한 잔잔하고 차분한 기록을 Day별 흐름에 따라 정리합니다.
          </p>
        </header>

        {timelineDays.map((day, index) => (
          <section key={day.day} className="space-y-md">
            <div className="flex items-start gap-md">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary bg-primary-fixed text-primary">
                {index + 1}
              </div>
              <div>
                <p className="text-metadata text-primary">{day.day}</p>
                <h2 className="korean-text text-screen-title text-on-surface">{day.title}</h2>
              </div>
            </div>

            <Card className="ml-0 overflow-hidden p-0 sm:ml-14">
              <div className="aspect-[16/9] bg-gradient-to-br from-primary-fixed via-surface-container-low to-surface-container-high" />
              <div className="space-y-md p-lg">
                <div className="flex items-center gap-sm">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <p className="text-section-title">AI Story Summary</p>
                </div>
                <p className="korean-text text-body text-on-surface-variant">
                  {uploads[index % uploads.length].memo}
                </p>
                <div className="flex items-center gap-xs text-metadata text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  스토리북 포함 후보
                </div>
              </div>
            </Card>
          </section>
        ))}
      </article>
    </AppShell>
  );
}
