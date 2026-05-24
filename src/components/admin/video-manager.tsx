"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Film, Link2Off, Trash2, UploadCloud } from "lucide-react";
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
  shareLinks: {
    id: string;
    type: string;
    isActive: boolean;
    expiresAt: string;
    createdAt: string;
    disabledAt: string | null;
  }[];
  outputs: {
    id: string;
    type: string;
    title: string;
    createdAt: string;
  }[];
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

export function VideoManager({ projectId, videos, shareLinks, outputs }: VideoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"videos" | "links" | "reports">("videos");
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

  async function disableShareLink(shareLinkId: string) {
    if (!window.confirm("이 공유 링크를 비활성화할까요?")) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/share-links/${shareLinkId}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "공유 링크 비활성화에 실패했습니다.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "공유 링크 비활성화에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-lg">
      <section className="grid gap-md md:grid-cols-3">
        <Card>
          <Film className="h-5 w-5 text-primary" />
          <p className="mt-xs text-metadata text-on-surface-variant">영상</p>
          <p className="text-section-title text-on-surface">{videos.length}개</p>
        </Card>
        <Card>
          <Link2Off className="h-5 w-5 text-primary" />
          <p className="mt-xs text-metadata text-on-surface-variant">공유 링크</p>
          <p className="text-section-title text-on-surface">{shareLinks.length}개</p>
        </Card>
        <Card>
          <FileText className="h-5 w-5 text-primary" />
          <p className="mt-xs text-metadata text-on-surface-variant">보고서</p>
          <p className="text-section-title text-on-surface">{outputs.length}개</p>
        </Card>
      </section>

      <div className="flex flex-wrap gap-xs">
        <Button
          size="sm"
          variant={tab === "videos" ? "primary" : "secondary"}
          onClick={() => setTab("videos")}
        >
          영상
        </Button>
        <Button
          size="sm"
          variant={tab === "links" ? "primary" : "secondary"}
          onClick={() => setTab("links")}
        >
          공유 링크
        </Button>
        <Button
          size="sm"
          variant={tab === "reports" ? "primary" : "secondary"}
          onClick={() => setTab("reports")}
        >
          보고서
        </Button>
      </div>

      {tab === "videos" ? (
        <>
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
        </>
      ) : null}

      {tab === "links" ? (
        <section className="space-y-md">
          <div>
            <h2 className="text-screen-title text-on-surface">공유 링크</h2>
            <p className="text-secondary text-on-surface-variant">
              스토리북 승인 페이지에서 발급된 외부 공유 링크를 관리합니다.
            </p>
          </div>
          {shareLinks.length > 0 ? (
            <div className="space-y-md">
              {shareLinks.map((link) => (
                <Card key={link.id}>
                  <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-xs">
                        <Badge className={link.isActive ? "border-primary text-primary" : ""}>
                          {link.isActive ? "활성" : "비활성"}
                        </Badge>
                        <Badge>{link.type}</Badge>
                      </div>
                      <p className="mt-sm text-section-title text-on-surface">
                        만료 {formatDate(link.expiresAt)}
                      </p>
                      <p className="text-secondary text-on-surface-variant">
                        생성 {formatDate(link.createdAt)}
                        {link.disabledAt ? ` · 비활성 ${formatDate(link.disabledAt)}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={!link.isActive || isSubmitting}
                      onClick={() => disableShareLink(link.id)}
                    >
                      <Link2Off className="h-4 w-4" />
                      비활성화
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <Link2Off className="h-6 w-6 text-primary" />
              <p className="mt-sm text-section-title text-on-surface">발급된 공유 링크가 없습니다</p>
              <p className="mt-xs text-secondary text-on-surface-variant">
                스토리북 승인 후 스토리북 승인 페이지에서 공유 링크를 발급할 수 있습니다.
              </p>
            </Card>
          )}
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="space-y-md">
          <div>
            <h2 className="text-screen-title text-on-surface">보고서 산출물</h2>
            <p className="text-secondary text-on-surface-variant">
              PDF/DOC/HTML 생성 기능이 연결되면 이곳에 산출물이 모입니다.
            </p>
          </div>
          {outputs.length > 0 ? (
            <div className="grid gap-md xl:grid-cols-2">
              {outputs.map((output) => (
                <Card key={output.id}>
                  <Badge>{output.type}</Badge>
                  <h3 className="mt-sm text-section-title text-on-surface">{output.title}</h3>
                  <p className="mt-xs text-secondary text-on-surface-variant">
                    생성 {formatDate(output.createdAt)}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <FileText className="h-6 w-6 text-primary" />
              <p className="mt-sm text-section-title text-on-surface">생성된 보고서가 없습니다</p>
              <p className="mt-xs text-secondary text-on-surface-variant">
                다음 단계에서 승인된 스토리북 기반 PDF/HTML 생성을 연결합니다.
              </p>
            </Card>
          )}
        </section>
      ) : null}
    </div>
  );
}
