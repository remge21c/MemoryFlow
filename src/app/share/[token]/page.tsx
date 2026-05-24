import { CalendarDays, Film, Link2, LockKeyhole } from "lucide-react";
import { StorybookPreview } from "@/components/storybook/storybook-preview";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { hashShareToken } from "@/lib/share-links/token";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

function InvalidLink({
  title = "링크가 만료되었습니다",
  description = "공유 링크가 비활성화되었거나 만료되었습니다. 링크를 발급한 관리자에게 다시 요청해 주세요.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <main className="min-h-dvh bg-background px-md py-xl text-on-background">
      <div className="mx-auto max-w-2xl">
        <Card>
          <div className="flex items-center gap-sm">
            <Link2 className="h-5 w-5 text-primary" />
            <h1 className="text-major-title text-on-surface">{title}</h1>
          </div>
          <p className="mt-sm text-secondary text-on-surface-variant">
            {description}
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
                      adminNote: true,
                      files: {
                        orderBy: { sortOrder: "asc" },
                        select: { id: true, fileType: true, mimeType: true },
                      },
                    },
                  },
                },
              },
            },
          },
          videos: {
            where: { deletedAt: null, status: "published" },
            orderBy: { uploadedAt: "desc" },
            take: 1,
            select: {
              id: true,
              title: true,
              uploadedAt: true,
            },
          },
        },
      },
    },
  });

  const storybook = shareLink?.project.storybook;

  if (!shareLink || !shareLink.isActive || shareLink.expiresAt.getTime() <= now.getTime()) {
    return <InvalidLink />;
  }

  if (!storybook || storybook.status !== "approved") {
    return (
      <InvalidLink
        title="아직 공개되지 않은 스토리북입니다"
        description="스토리북 승인 후에만 공유 링크로 열람할 수 있습니다. 링크를 발급한 관리자에게 승인 상태를 확인해 주세요."
      />
    );
  }

  const days = new Map<
    string,
    {
      id: string;
      dayNumber: number;
      title: string | null;
      date: string;
      uploads: {
        id: string;
        type: "photo" | "video";
        memo: string | null;
        adminNote: string | null;
        files: { id: string; fileType: "image" | "video"; mimeType: string | null }[];
        schedule: { id: string; time: string | null; title: string; location: string | null };
      }[];
    }
  >();

  for (const item of storybook.items) {
    const upload = {
      id: item.upload.id,
      type: item.upload.type,
      memo: item.caption ?? item.upload.memo,
      adminNote: item.caption ?? item.upload.adminNote,
      files: item.upload.files,
      schedule: item.schedule,
    };
    const current = days.get(item.day.id);

    if (current) {
      current.uploads.push(upload);
    } else {
      days.set(item.day.id, {
        id: item.day.id,
        dayNumber: item.day.dayNumber,
        title: item.day.title,
        date: item.day.date.toISOString(),
        uploads: [upload],
      });
    }
  }

  const storybookDays = [...days.values()];
  const latestVideo = shareLink.project.videos[0];

  if (storybookDays.length === 0) {
    return (
      <InvalidLink
        title="공개할 스토리 항목이 없습니다"
        description="공유 링크는 유효하지만 승인된 스토리북에 표시할 항목이 없습니다. 관리자에게 스토리북 구성을 확인해 주세요."
      />
    );
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
                {shareLink.project.name} / {shareLink.project.orgName ?? "소속 없음"}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-xs sm:flex">
            <Badge className="border-primary bg-primary-fixed text-on-primary-fixed">
              읽기 전용
            </Badge>
            <Badge>만료 {formatDate(shareLink.expiresAt)}</Badge>
          </div>
        </div>
      </header>

      <div className="px-md py-xl">
        <section className="mx-auto mb-lg grid max-w-5xl gap-md sm:grid-cols-2">
          <Card>
            <div className="flex items-center gap-sm">
              <LockKeyhole className="h-5 w-5 text-primary" />
              <div>
                <p className="text-section-title text-on-surface">공유 링크 열람</p>
                <p className="text-secondary text-on-surface-variant">
                  댓글과 좋아요 없이 결과물만 볼 수 있습니다.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-sm">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="text-section-title text-on-surface">링크 만료일</p>
                <p className="text-secondary text-on-surface-variant">
                  {formatDate(shareLink.expiresAt)}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {latestVideo ? (
          <section className="mx-auto mb-xl max-w-5xl">
            <Card className="overflow-hidden p-0">
              <video
                src={`/api/share/${token}/videos/${latestVideo.id}`}
                className="aspect-video w-full bg-black object-contain"
                controls
                preload="metadata"
              />
              <div className="space-y-sm p-md">
                <div className="flex items-center gap-sm">
                  <Film className="h-5 w-5 text-primary" />
                  <h2 className="text-section-title text-on-surface">{latestVideo.title}</h2>
                </div>
                <p className="text-secondary text-on-surface-variant">
                  최종 영상 · {formatDate(latestVideo.uploadedAt)}
                </p>
              </div>
            </Card>
          </section>
        ) : null}

        <StorybookPreview
          project={{
            name: shareLink.project.name,
            orgName: shareLink.project.orgName,
            startDate: shareLink.project.startDate.toISOString(),
            endDate: shareLink.project.endDate.toISOString(),
          }}
          storybook={storybook}
          days={storybookDays}
          mediaSrcPrefix={`/api/share/${token}/media`}
          modeLabel="승인된 스토리북"
        />
      </div>
    </main>
  );
}
