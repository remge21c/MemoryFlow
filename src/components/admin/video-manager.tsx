"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Trash2, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ProjectVideo = {
  id: string;
  title: string;
  status: string;
  sizeBytes: number;
  uploadedAt: string;
};

type VideoManagerProps = {
  projectId: string;
  videos: ProjectVideo[];
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function VideoManager({ projectId, videos }: VideoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function uploadVideo() {
    if (!file) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.set("title", title.trim() || file.name.replace(/\.[^.]+$/, ""));
      body.set("file", file);

      const response = await fetch(`/api/admin/projects/${projectId}/videos`, {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "영상 업로드에 실패했습니다.");
      }

      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "영상 업로드에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteVideo(videoId: string) {
    if (!window.confirm("이 영상을 삭제할까요?")) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/videos?videoId=${videoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "영상 삭제에 실패했습니다.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "영상 삭제에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-lg">
      <Card className="space-y-md">
        <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-section-title text-on-surface">최종 영상 업로드</h2>
            <p className="text-secondary text-on-surface-variant">
              A18 VideoFlow에서 렌더링한 완성본을 MemoryFlow에 보관합니다.
            </p>
          </div>
          <Badge className="border-primary text-primary">mp4 / mov / webm · 500MB 이하</Badge>
        </div>

        <label className="grid gap-xs">
          <span className="text-metadata text-on-surface-variant">영상 제목</span>
          <input
            className="min-h-tap-target rounded border border-outline-variant bg-surface-container-lowest px-sm py-xs text-secondary text-on-surface outline-none focus:border-primary"
            placeholder="예: 2026 봄 교토 가족여행 최종 영상"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <div className="rounded border border-dashed border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded bg-primary-fixed text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-section-title text-on-surface">
                  {file ? file.name : "영상 파일 선택"}
                </p>
                <p className="text-secondary text-on-surface-variant">
                  {file ? formatBytes(file.size) : "완성본 파일 1개를 선택해 주세요."}
                </p>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              찾아보기
            </Button>
          </div>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex justify-end">
          <Button disabled={!file || isSubmitting} onClick={uploadVideo}>
            {isSubmitting ? "업로드 중..." : "영상 업로드"}
          </Button>
        </div>
        {error ? <p className="text-secondary text-error">{error}</p> : null}
      </Card>

      <section className="space-y-md">
        <div>
          <h2 className="text-screen-title text-on-surface">업로드된 영상</h2>
          <p className="text-secondary text-on-surface-variant">
            홈과 공유 링크에서 최신 공개 영상이 표시됩니다.
          </p>
        </div>

        {videos.length > 0 ? (
          <div className="grid gap-md xl:grid-cols-2">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden p-0">
                <video
                  src={`/api/videos/${video.id}`}
                  className="aspect-video w-full bg-black object-contain"
                  controls
                  preload="metadata"
                />
                <div className="space-y-sm p-md">
                  <div className="flex flex-wrap items-center gap-xs">
                    <Badge className="border-primary text-primary">{video.status}</Badge>
                    <Badge>{formatBytes(video.sizeBytes)}</Badge>
                    <Badge>{formatDate(video.uploadedAt)}</Badge>
                  </div>
                  <div className="flex items-center gap-sm">
                    <Film className="h-5 w-5 text-primary" />
                    <h3 className="text-section-title text-on-surface">{video.title}</h3>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => deleteVideo(video.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Film className="h-6 w-6 text-primary" />
            <p className="mt-sm text-section-title text-on-surface">업로드된 영상이 없습니다</p>
            <p className="mt-xs text-secondary text-on-surface-variant">
              스토리북 승인 후 A18에서 만든 완성 영상을 이곳에 올려 주세요.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
