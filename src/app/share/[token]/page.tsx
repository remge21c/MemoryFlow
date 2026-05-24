import { Link2 } from "lucide-react";
import { StorybookPreview } from "@/components/storybook/storybook-preview";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { hashShareToken } from "@/lib/share-links/token";

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
          <Badge className="hidden border-primary bg-primary-fixed text-on-primary-fixed sm:inline-flex">
            읽기 전용
          </Badge>
        </div>
      </header>

      <div className="px-md py-xl">
        <StorybookPreview
          project={{
            name: shareLink.project.name,
            orgName: shareLink.project.orgName,
            startDate: shareLink.project.startDate.toISOString(),
            endDate: shareLink.project.endDate.toISOString(),
          }}
          storybook={storybook}
          days={[...days.values()]}
          mediaSrcPrefix={`/api/share/${token}/media`}
          modeLabel="승인된 스토리북"
        />
      </div>
    </main>
  );
}
