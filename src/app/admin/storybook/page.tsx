import { GripVertical, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploads } from "@/lib/mock-data";

export default function AdminStorybookPage() {
  return (
    <AppShell title="스토리북 승인" section="admin">
      <div className="grid gap-lg lg:grid-cols-[1fr_360px]">
        <section className="space-y-md">
          <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-major-title text-on-surface">스토리북 편집</h1>
              <p className="text-secondary text-on-surface-variant">
                업로드 항목을 정리하고 승인 전 AI 검수를 실행합니다.
              </p>
            </div>
            <Button>
              <Sparkles className="h-4 w-4" />
              AI 검수 실행
            </Button>
          </div>

          <Card className="overflow-hidden p-0">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex min-h-tap-target items-center gap-md border-b border-outline-variant p-md last:border-b-0"
              >
                <button aria-label="정렬" className="text-on-surface-variant">
                  <GripVertical className="h-5 w-5" />
                </button>
                <div className="h-[60px] w-[60px] flex-shrink-0 rounded-md border border-outline-variant bg-gradient-to-br from-primary-fixed to-surface-container" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-xs">
                    <Badge>{upload.schedule}</Badge>
                    <Badge>{upload.type === "video" ? "영상" : "사진"}</Badge>
                  </div>
                  <p className="korean-text mt-xs truncate text-body font-medium text-on-surface">
                    {upload.title}
                  </p>
                  <p className="mt-base truncate text-secondary text-on-surface-variant">
                    {upload.memo}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label="제외">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </Card>
        </section>

        <aside className="space-y-md">
          <Card>
            <h2 className="text-section-title text-on-surface">승인 상태</h2>
            <p className="mt-sm text-secondary text-on-surface-variant">
              승인 후 업로더의 추가 업로드와 수정은 잠깁니다.
            </p>
            <Button className="mt-md w-full">스토리북 승인</Button>
          </Card>
          <Card>
            <h2 className="text-section-title text-on-surface">AI 검수 요약</h2>
            <div className="mt-md space-y-sm">
              <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                <p className="text-secondary">Day 3 메모 2건에 개인정보 가능성이 있는 표현이 있습니다.</p>
              </div>
              <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                <p className="text-secondary">영상 자막 후보는 승인 후 슈퍼 어드민이 생성합니다.</p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
