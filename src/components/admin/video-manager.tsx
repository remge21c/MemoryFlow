"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Film,
  Link2,
  Link2Off,
  Trash2,
  UploadCloud,
} from "lucide-react";
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

const expiryOptions = [30, 60, 120, 180, 360];

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

function outputLabel(type: string) {
  return type.toUpperCase();
}

export function VideoManager({ projectId, videos, shareLinks, outputs }: VideoManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"videos" | "links" | "reports">("videos");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [newShareLink, setNewShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeShareLinks = shareLinks.filter(
    (link) => link.isActive && new Date(link.expiresAt).getTime() > Date.now(),
  );

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

  async function createShareLink() {
    setError(null);
    setNewShareLink(null);
    setCopied(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/share-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; path?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "공유 링크 발급에 실패했습니다.");
      }

      setNewShareLink(`${window.location.origin}${data?.path}`);
      setTab("links");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "공유 링크 발급에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyShareLink() {
    if (!newShareLink) return;
    await navigator.clipboard.writeText(newShareLink);
    setCopied(true);
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

  async function createOutput(type: "html" | "pdf" | "doc") {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/outputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "산출물 생성에 실패했습니다.");
      }

      router.refresh();
      setTab("reports");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "산출물 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-lg">
      <section className="grid gap-md md:grid-cols-3">
        <Card>
          <Film className="h-5 w-5 text-primary" />
          <p className="mt-xs text-metadata text-on-surface-variant">최종 영상</p>
          <p className="text-section-title text-on-surface">{videos.length}개</p>
          <p className="mt-xs text-metadata text-on-surface-variant">
            홈과 공유 페이지에 최신 영상 표시
          </p>
        </Card>
        <Card>
          <Link2 className="h-5 w-5 text-primary" />
          <p className="mt-xs text-metadata text-on-surface-variant">활성 공유 링크</p>
          <p className="text-section-title text-on-surface">{activeShareLinks.length}개</p>
          <p className="mt-xs text-metadata text-on-surface-variant">
            전체 발급 {shareLinks.length}개
          </p>
        </Card>
        <Card>
          <FileText className="h-5 w-5 text-primary" />
          <p className="mt-xs text-metadata text-on-surface-variant">보고서 산출물</p>
          <p className="text-section-title text-on-surface">{outputs.length}개</p>
          <p className="mt-xs text-metadata text-on-surface-variant">HTML / PDF / DOC</p>
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

      {error ? (
        <Card className="border-error bg-error-container text-on-error-container">
          <p className="text-secondary">{error}</p>
        </Card>
      ) : null}

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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
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
          </Card>

          <section className="space-y-md">
            <div>
              <h2 className="text-screen-title text-on-surface">업로드된 영상</h2>
              <p className="text-secondary text-on-surface-variant">
                최신 공개 영상 1개가 홈과 외부 공유 링크 화면에 표시됩니다.
              </p>
            </div>

            {videos.length > 0 ? (
              <div className="grid gap-md xl:grid-cols-2">
                {videos.map((video, index) => (
                  <Card key={video.id} className="overflow-hidden p-0">
                    <video
                      src={`/api/videos/${video.id}`}
                      className="aspect-video w-full bg-black object-contain"
                      controls
                      preload="metadata"
                    />
                    <div className="space-y-sm p-md">
                      <div className="flex flex-wrap items-center gap-xs">
                        <Badge className="border-primary text-primary">
                          {index === 0 ? "공유 대표 영상" : video.status}
                        </Badge>
                        <Badge>{formatBytes(video.sizeBytes)}</Badge>
                        <Badge>{formatDate(video.uploadedAt)}</Badge>
                      </div>
                      <div className="flex items-center gap-sm">
                        <Film className="h-5 w-5 text-primary" />
                        <h3 className="text-section-title text-on-surface">{video.title}</h3>
                      </div>
                      <div className="flex flex-wrap justify-end gap-xs">
                        <Button asChild variant="secondary">
                          <a href={`/api/videos/${video.id}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            새 창
                          </a>
                        </Button>
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
          <Card className="space-y-md">
            <div className="flex items-center gap-sm">
              <Link2 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-section-title text-on-surface">공유 링크 발급</h2>
                <p className="text-secondary text-on-surface-variant">
                  승인된 스토리북과 최신 최종 영상을 외부 열람용 링크로 공유합니다.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-xs sm:flex-row">
              <select
                className="min-h-tap-target rounded border border-outline-variant bg-surface-container-lowest px-sm text-secondary text-on-surface"
                value={expiresInDays}
                disabled={isSubmitting}
                onChange={(event) => setExpiresInDays(Number(event.target.value))}
              >
                {expiryOptions.map((days) => (
                  <option key={days} value={days}>
                    {days}일
                  </option>
                ))}
              </select>
              <Button disabled={isSubmitting} onClick={createShareLink}>
                <Link2 className="h-4 w-4" />
                공유 링크 발급
              </Button>
            </div>
            {newShareLink ? (
              <div className="rounded border border-primary bg-primary-fixed/30 p-sm">
                <p className="break-all text-secondary text-on-surface">{newShareLink}</p>
                <Button className="mt-sm" size="sm" variant="secondary" onClick={copyShareLink}>
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "복사됨" : "링크 복사"}
                </Button>
              </div>
            ) : null}
          </Card>

          <div>
            <h2 className="text-screen-title text-on-surface">공유 링크 목록</h2>
            <p className="text-secondary text-on-surface-variant">
              기존 링크는 보안상 토큰을 다시 표시하지 않고, 새로 발급한 링크만 즉시 복사할 수 있습니다.
            </p>
          </div>
          {shareLinks.length > 0 ? (
            <div className="space-y-md">
              {shareLinks.map((link) => {
                const isExpired = new Date(link.expiresAt).getTime() <= Date.now();
                const isUsable = link.isActive && !isExpired;

                return (
                  <Card key={link.id}>
                    <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-xs">
                          <Badge className={isUsable ? "border-primary text-primary" : ""}>
                            {isUsable ? "활성" : "비활성"}
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
                );
              })}
            </div>
          ) : (
            <Card>
              <Link2Off className="h-6 w-6 text-primary" />
              <p className="mt-sm text-section-title text-on-surface">발급된 공유 링크가 없습니다</p>
              <p className="mt-xs text-secondary text-on-surface-variant">
                스토리북 승인 후 이 화면에서 공유 링크를 발급할 수 있습니다.
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
              승인된 스토리북을 HTML, PDF, DOC 산출물로 생성하고 다운로드합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-xs">
            <Button size="sm" disabled={isSubmitting} onClick={() => createOutput("html")}>
              HTML 생성
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => createOutput("pdf")}
            >
              PDF 생성
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => createOutput("doc")}
            >
              DOC 생성
            </Button>
          </div>
          {outputs.length > 0 ? (
            <div className="grid gap-md xl:grid-cols-2">
              {outputs.map((output) => (
                <Card key={output.id}>
                  <Badge>{outputLabel(output.type)}</Badge>
                  <h3 className="mt-sm text-section-title text-on-surface">{output.title}</h3>
                  <p className="mt-xs text-secondary text-on-surface-variant">
                    생성 {formatDate(output.createdAt)}
                  </p>
                  <div className="mt-md flex flex-wrap gap-xs">
                    <Button asChild variant="secondary">
                      <a href={`/api/outputs/${output.id}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        열기
                      </a>
                    </Button>
                    <Button asChild variant="ghost">
                      <a href={`/api/outputs/${output.id}`} download>
                        <Download className="h-4 w-4" />
                        다운로드
                      </a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <FileText className="h-6 w-6 text-primary" />
              <p className="mt-sm text-section-title text-on-surface">생성된 보고서가 없습니다</p>
              <p className="mt-xs text-secondary text-on-surface-variant">
                스토리북을 승인한 뒤 HTML, PDF, DOC 산출물을 생성해 주세요.
              </p>
            </Card>
          )}
        </section>
      ) : null}
    </div>
  );
}
