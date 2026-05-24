import { redirect } from "next/navigation";
import { VideoManager } from "@/components/admin/video-manager";
import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export default async function AdminGalleryPage() {
  const currentUser = await getCurrentUser();

  if (currentUser?.globalRole !== "super_admin") {
    redirect("/forbidden");
  }

  if (!currentUser.activeProjectId) {
    return (
      <AppShell title="산출물 갤러리" section="admin">
        <Card>
          <h1 className="text-major-title text-on-surface">활성 프로젝트가 없습니다</h1>
          <p className="mt-sm text-secondary text-on-surface-variant">
            프로젝트 관리에서 작업할 프로젝트를 먼저 적용해 주세요.
          </p>
        </Card>
      </AppShell>
    );
  }

  const videos = await prisma.projectVideo.findMany({
    where: { projectId: currentUser.activeProjectId, deletedAt: null },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      sizeBytes: true,
      uploadedAt: true,
    },
  });

  return (
    <AppShell title="산출물 갤러리" section="admin">
      <VideoManager
        projectId={currentUser.activeProjectId}
        videos={videos.map((video) => ({
          ...video,
          sizeBytes: Number(video.sizeBytes),
          uploadedAt: video.uploadedAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
