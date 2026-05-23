import { Grid2X2, List, Plus, Video } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploads } from "@/lib/mock-data";

export default function UploadPage() {
  return (
    <AppShell title="업로드">
      <div className="space-y-lg">
        <section className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">내 업로드</h1>
            <p className="text-secondary text-on-surface-variant">
              Day와 세부일정에 맞춰 사진, 영상, 메모를 남깁니다.
            </p>
          </div>
          <div className="flex gap-xs">
            <Button variant="secondary" size="icon" aria-label="카드 보기">
              <Grid2X2 className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" aria-label="목록 보기">
              <List className="h-5 w-5" />
            </Button>
            <Button>
              <Plus className="h-4 w-4" />
              새 업로드
            </Button>
          </div>
        </section>

        <section className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
          {uploads.map((upload) => (
            <Card key={upload.id} className="overflow-hidden p-0">
              <div className="relative aspect-[4/3] bg-surface-container">
                <div className="absolute inset-md rounded-md bg-gradient-to-br from-primary-fixed to-surface-container-high" />
                {upload.type === "video" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface">
                      <Video className="h-5 w-5" />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-sm p-md">
                <div className="flex items-center justify-between gap-sm">
                  <Badge>{upload.schedule}</Badge>
                  <span className="text-metadata text-on-surface-variant">{upload.time}</span>
                </div>
                <h2 className="korean-text text-section-title text-on-surface">{upload.title}</h2>
                <p className="line-clamp-2 text-secondary text-on-surface-variant">{upload.memo}</p>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
