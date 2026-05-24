"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ShareLink = {
  id: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  disabledAt: string | null;
  creator?: { name: string } | null;
};

type ShareLinkManagerProps = {
  projectId: string;
  isApproved: boolean;
  initialShareLinks: ShareLink[];
};

const expiryOptions = [30, 60, 120, 180, 360];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ShareLinkManager({
  projectId,
  isApproved,
  initialShareLinks,
}: ShareLinkManagerProps) {
  const router = useRouter();
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createLink() {
    setError(null);
    setNewLink(null);
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

      setNewLink(`${window.location.origin}${data?.path}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "공유 링크 발급에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function disableLink(shareLinkId: string) {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/projects/${projectId}/share-links/${shareLinkId}`,
        { method: "PATCH" },
      );

      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "공유 링크 비활성화에 실패했습니다.");
      }

      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "공유 링크 비활성화에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyNewLink() {
    if (!newLink) return;
    await navigator.clipboard.writeText(newLink);
  }

  return (
    <Card>
      <div className="flex items-center gap-sm">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="text-section-title text-on-surface">공유 링크</h2>
      </div>
      <p className="mt-sm text-secondary text-on-surface-variant">
        승인된 스토리북을 외부에서 로그인 없이 읽기 전용으로 볼 수 있습니다.
      </p>

      <div className="mt-md flex gap-xs">
        <select
          className="min-h-tap-target flex-1 rounded border border-outline-variant bg-surface-container-lowest px-sm text-secondary"
          value={expiresInDays}
          disabled={!isApproved || isSubmitting}
          onChange={(event) => setExpiresInDays(Number(event.target.value))}
        >
          {expiryOptions.map((days) => (
            <option key={days} value={days}>
              {days}일
            </option>
          ))}
        </select>
        <Button disabled={!isApproved || isSubmitting} onClick={createLink}>
          발급
        </Button>
      </div>

      {!isApproved ? (
        <p className="mt-xs text-metadata text-on-surface-variant">
          스토리북 승인 후 공유 링크를 발급할 수 있습니다.
        </p>
      ) : null}

      {newLink ? (
        <div className="mt-md rounded border border-primary bg-primary-fixed/30 p-sm">
          <p className="break-all text-secondary text-on-surface">{newLink}</p>
          <Button className="mt-sm" size="sm" variant="secondary" onClick={copyNewLink}>
            <Copy className="h-4 w-4" />
            복사
          </Button>
        </div>
      ) : null}

      <div className="mt-md space-y-sm">
        {initialShareLinks.map((shareLink) => {
          const isExpired = new Date(shareLink.expiresAt).getTime() < Date.now();

          return (
            <div
              key={shareLink.id}
              className="rounded border border-outline-variant bg-surface-container-lowest p-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-xs">
                <Badge
                  className={
                    shareLink.isActive && !isExpired
                      ? "border-primary bg-primary-fixed text-on-primary-fixed"
                      : ""
                  }
                >
                  {shareLink.isActive && !isExpired ? "활성" : "비활성"}
                </Badge>
                {shareLink.isActive ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={() => disableLink(shareLink.id)}
                  >
                    <XCircle className="h-4 w-4" />
                    비활성화
                  </Button>
                ) : null}
              </div>
              <p className="mt-xs text-metadata text-on-surface-variant">
                만료 {formatDateTime(shareLink.expiresAt)}
              </p>
              <p className="text-metadata text-on-surface-variant">
                발급 {formatDateTime(shareLink.createdAt)}
                {shareLink.creator?.name ? ` · ${shareLink.creator.name}` : ""}
              </p>
            </div>
          );
        })}
        {initialShareLinks.length === 0 ? (
          <p className="text-secondary text-on-surface-variant">아직 발급된 링크가 없습니다.</p>
        ) : null}
      </div>

      {error ? <p className="mt-sm text-secondary text-error">{error}</p> : null}
    </Card>
  );
}
