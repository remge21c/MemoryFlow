import { BookOpen, CalendarDays, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { hashShareToken } from "@/lib/share-links/token";
import { formatDate } from "@/lib/utils";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

function InvalidLink() {
  return (
    <main className="min-h-dvh bg-background px-md py-xl text-on-background">
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="flex items-center gap-sm">
            <Link2 className="h-5 w-5 text-primary" />
            <h1 className="text-major-title text-on-surface">링크가 만료되었습니다</h1>
          </div>
          <p className="mt-sm text-secondary text-on-surface-variant">
            공유 링크가 비활성화되었거나 만료되었습니다. 링크를 발급한 관리자에게 다시
            요청해 주세요.
          </p>
        </Card>
      </div>
    </main>
  );
}

export default async function ShareStorybookPage({ params }: SharePageProps) {
  const { token } = await params;
  const tokenHash = hashShareToken(token);
  const now = new Date();

  const shareLink = await prisma.shareLink.findUnique({
    where: { tokenHash },
    include: {
      project: {
        include: {
          storybook: {
            include: {
              items: {
                where: { isVisible: true },
                orderBy: { sortOrder: "asc" },
                include: {
                  day: { select: { id: true, dayNumber: true, title: true, date: true } },
                  schedule: {
                    select: { id: true, time: true, title: true, location: true },
                  },
                  upload: {
                    select: {
                      id: true,
                      type: true,
                      memo: true,
                      files: {
                        orderBy: { sortOrder: "asc" },
                        select: { id: true, fileType: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const storybook = shareLink?.project.storybook;

  if (
    !shareLink ||
    !shareLink.isActive ||
    shareLink.expiresAt.getTime() <= now.getTime() ||
    !storybook ||
    storybook.status !== "approved"
  ) {
    return <InvalidLink />;
  }

  const { project } = shareLink;
  const days = new Map<
    string,
    {
      id: string;
      dayNumber: number;
      title: string | null;
      date: Date;
      items: typeof storybook.items;
    }
  >();

  for (const item of storybook.items) {
    const current = days.get(item.day.id);
    if (current) {
      current.items.push(item);
    } else {
      days.set(item.day.id, {
        id: item.day.id,
        dayNumber: item.day.dayNumber,
        title: item.day.title,
        date: item.day.date,
        items: [item],
      });
    }
  }

  return (
    <main className="min-h-dvh bg-background text-on-background">
      <header className="sticky top-0 z-20 border-b border-outline-variant bg-surface/95 px-md py-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-md">
          <div className="flex min-w-0 items-center gap-sm">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-primary text-secondary font-semibold text-on-primary">
              MF
            </div>
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-on-surface">MemoryFlow</p>
              <p className="truncate text-metadata text-on-surface-variant">
                {project.name} / {project.orgName ?? "소속 없음"}
              </p>
            </div>
          </div>
          <Badge className="hidden border-primary bg-primary-fixed text-on-primary-fixed sm:inline-flex">
            읽기 전용
          </Badge>
        </div>
      </header>

      <article className="mx-auto max-w-5xl space-y-xl px-md py-xl">
        <section className="space-y-sm">
          <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
            승인된 스토리북
          </Badge>
          <h1 className="korean-text text-major-title text-on-surface">
            {storybook.title ?? `${project.name} 스토리북`}
          </h1>
          <p className="text-secondary text-on-surface-variant">
            {formatDate(project.startDate)} - {formatDate(project.endDate)}
          </p>
          {storybook.openingText ? (
            <p className="korean-text max-w-3xl text-body text-on-surface-variant">
              {storybook.openingText}
            </p>
          ) : null}
        </section>

        {[...days.values()].map((day) => (
          <section key={day.id} className="space-y-md">
            <div className="flex items-start gap-md">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-primary bg-primary-fixed text-primary">
                {day.dayNumber}
              </div>
              <div>
                <p className="flex items-center gap-xs text-metadata text-primary">
                  <CalendarDays className="h-4 w-4" />
                  Day {day.dayNumber} · {formatDate(day.date)}
                </p>
                <h2 className="korean-text text-screen-title text-on-surface">
                  {day.title ?? "여행 일정"}
                </h2>
              </div>
            </div>

            <div className="space-y-md sm:ml-14">
              {day.items.map((item) => (
                <Card key={item.id} className="overflow-hidden p-0">
                  <div className="aspect-[16/9] bg-gradient-to-br from-primary-fixed via-surface-container-low to-surface-container-high" />
                  <div className="space-y-sm p-lg">
                    <div className="flex flex-wrap items-center gap-xs">
                      <Badge>{item.upload.type === "video" ? "영상" : "사진"}</Badge>
                      <Badge>
                        {item.schedule.time ? `${item.schedule.time} · ` : ""}
                        {item.schedule.title}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-sm">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <p className="text-section-title text-on-surface">
                        {item.schedule.location ?? "기록"}
                      </p>
                    </div>
                    <p className="korean-text text-body text-on-surface-variant">
                      {item.caption ?? item.upload.memo ?? "메모 없음"}
                    </p>
                    <p className="text-metadata text-on-surface-variant">
                      파일 {item.upload.files.length}개
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {storybook.closingText ? (
          <Card>
            <p className="korean-text text-body text-on-surface-variant">{storybook.closingText}</p>
          </Card>
        ) : null}
      </article>
    </main>
  );
}
