import { ArrowRight, CheckCircle2, Clock, Film, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { activeProject, timelineDays, uploads } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <AppShell title="홈">
      <div className="space-y-xl">
        <section className="grid gap-lg lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-lg">
            <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge>활성 프로젝트</Badge>
                <h1 className="korean-text mt-sm text-major-title text-on-surface">
                  {activeProject.name}
                </h1>
                <p className="mt-xs text-secondary text-on-surface-variant">
                  {activeProject.period}
                </p>
              </div>
              <Button className="self-start">
                새 업로드
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-xl">
              <div className="mb-sm flex items-center justify-between">
                <p className="text-section-title text-on-surface">정리 진행도</p>
                <p className="text-screen-title text-primary">{activeProject.progress}%</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${activeProject.progress}%` }}
                />
              </div>
            </div>
          </Card>

          <Card className="p-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-section-title text-on-surface">다음 세부일정</p>
                <p className="text-secondary text-on-surface-variant">오늘 오후 2:30</p>
              </div>
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-lg rounded-md border border-outline-variant bg-surface-container-lowest p-md">
              <p className="text-body font-medium">철학의 길 산책</p>
              <p className="mt-base text-secondary text-on-surface-variant">
                비가 예보되어 있어 실내 찻집 일정과 함께 기록합니다.
              </p>
            </div>
          </Card>
        </section>

        <section>
          <div className="mb-md flex items-end justify-between">
            <div>
              <h2 className="text-screen-title text-on-surface">여행 타임라인</h2>
              <p className="text-secondary text-on-surface-variant">Day별 정리 상태</p>
            </div>
          </div>
          <div className="grid gap-md md:grid-cols-3">
            {timelineDays.map((item) => (
              <Card
                key={item.day}
                className={item.current ? "border-primary bg-primary-fixed/40" : ""}
              >
                <p className="text-metadata text-primary">{item.day}</p>
                <h3 className="korean-text mt-xs text-section-title text-on-surface">
                  {item.title}
                </h3>
                <p className="mt-sm text-secondary text-on-surface-variant">{item.status}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-lg lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-md flex items-center justify-between">
              <h2 className="text-screen-title text-on-surface">최근 업로드</h2>
              <Button variant="ghost">
                모두 보기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-md sm:grid-cols-2">
              {uploads.slice(0, 4).map((upload) => (
                <Card key={upload.id} className="overflow-hidden p-0">
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary-fixed to-surface-container" />
                  <div className="p-md">
                    <Badge>{upload.schedule}</Badge>
                    <h3 className="korean-text mt-sm text-section-title text-on-surface">
                      {upload.title}
                    </h3>
                    <p className="mt-xs line-clamp-2 text-secondary text-on-surface-variant">
                      {upload.memo}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-md">
            <Card>
              <div className="flex items-center gap-sm">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-section-title">최종 스토리북</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                관리자가 기록을 정리하고 있습니다. 승인 후 스토리북으로 공개됩니다.
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-sm">
                <Film className="h-5 w-5 text-primary" />
                <p className="text-section-title">최종 영상</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                스토리북 승인 후 A18 VideoFlow에서 제작한 영상을 업로드합니다.
              </p>
            </Card>
            <Card>
              <div className="flex items-center gap-sm">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="text-section-title">AI 검수</p>
              </div>
              <p className="mt-sm text-secondary text-on-surface-variant">
                메모 요약, 개인정보 의심 문구, 자막 초안을 검토합니다.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
