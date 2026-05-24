"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  Unlock,
} from "lucide-react";
import { ShareLinkManager } from "@/components/admin/share-link-manager";
import { MediaPreview } from "@/components/media/media-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Upload = {
  id: string;
  type: "photo" | "video";
  memo: string | null;
  isInStorybook: boolean;
  adminNote: string | null;
  sortOrder: number;
  user: { name: string };
  files: { id: string; fileType: "image" | "video"; mimeType: string | null }[];
};

type Schedule = {
  id: string;
  time: string | null;
  title: string;
  location: string | null;
  uploads: Upload[];
};

type Day = {
  id: string;
  dayNumber: number;
  title: string | null;
  schedules: Schedule[];
};

type ShareLink = {
  id: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  disabledAt: string | null;
  creator?: { name: string } | null;
};

type StorybookEditorProps = {
  projectId: string;
  isSuperAdmin: boolean;
  storybook: {
    status: "draft" | "approved";
    title: string | null;
    openingText: string | null;
    closingText: string | null;
    approvedAt: string | null;
  };
  days: Day[];
  shareLinks: ShareLink[];
};

const inputClass =
  "min-h-tap-target rounded border border-outline-variant bg-surface-container-lowest px-sm py-xs text-secondary text-on-surface outline-none focus:border-primary";

async function requestJson(url: string, method: "PATCH" | "POST", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "요청 처리에 실패했습니다.");
  }

  return response.json().catch(() => null);
}

export function StorybookEditor({
  projectId,
  isSuperAdmin,
  storybook,
  days,
  shareLinks,
}: StorybookEditorProps) {
  const router = useRouter();
  const isApproved = storybook.status === "approved";
  const [title, setTitle] = useState(storybook.title ?? "");
  const [openingText, setOpeningText] = useState(storybook.openingText ?? "");
  const [closingText, setClosingText] = useState(storybook.closingText ?? "");
  const [uploadForms, setUploadForms] = useState<
    Record<string, { isInStorybook: boolean; adminNote: string }>
  >(() =>
    Object.fromEntries(
      days.flatMap((day) =>
        day.schedules.flatMap((schedule) =>
          schedule.uploads.map((upload) => [
            upload.id,
            {
              isInStorybook: upload.isInStorybook,
              adminNote: upload.adminNote ?? "",
            },
          ]),
        ),
      ),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploads = days.flatMap((day) => day.schedules.flatMap((schedule) => schedule.uploads));
  const includedCount = Object.values(uploadForms).filter((form) => form.isInStorybook).length;

  function setUploadForm(
    uploadId: string,
    patch: Partial<{ isInStorybook: boolean; adminNote: string }>,
  ) {
    setUploadForms((current) => ({
      ...current,
      [uploadId]: { ...current[uploadId], ...patch },
    }));
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setIsSubmitting(true);
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "요청 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveMetadata() {
    await requestJson(`/api/admin/projects/${projectId}/storybook`, "PATCH", {
      title,
      openingText,
      closingText,
    });
  }

  async function saveUpload(uploadId: string) {
    await requestJson(
      `/api/admin/projects/${projectId}/uploads/${uploadId}/storybook`,
      "PATCH",
      uploadForms[uploadId],
    );
  }

  async function moveUpload(uploadId: string, direction: "up" | "down") {
    await requestJson(
      `/api/admin/projects/${projectId}/uploads/${uploadId}/order`,
      "PATCH",
      { direction },
    );
  }

  async function approve() {
    await saveMetadata();
    await requestJson(`/api/admin/projects/${projectId}/storybook/approve`, "POST");
  }

  async function unlock() {
    await requestJson(`/api/admin/projects/${projectId}/storybook/unlock`, "POST");
  }

  return (
    <div className="grid gap-lg lg:grid-cols-[1fr_360px]">
      <section className="space-y-md">
        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-major-title text-on-surface">스토리북 편집</h1>
            <p className="text-secondary text-on-surface-variant">
              업로드 기록을 정리하고 순서를 조정한 뒤 최종 형태를 미리 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-xs">
            <Button asChild variant="secondary">
              <Link href="/admin/storybook/preview">
                <Eye className="h-4 w-4" />
                미리보기
              </Link>
            </Button>
            <Button variant="secondary" disabled>
              <Sparkles className="h-4 w-4" />
              AI 검수 준비 중
            </Button>
          </div>
        </div>

        <Card className="space-y-md">
          <div>
            <h2 className="text-section-title text-on-surface">스토리북 문구</h2>
            <p className="text-secondary text-on-surface-variant">
              최종 공유 페이지와 PDF/VideoFlow 패키지의 기본 문구로 사용됩니다.
            </p>
          </div>
          <input
            className={`${inputClass} w-full`}
            value={title}
            disabled={isApproved}
            placeholder="스토리북 제목"
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className={`${inputClass} min-h-28 w-full resize-y`}
            value={openingText}
            disabled={isApproved}
            placeholder="오프닝 문구"
            onChange={(event) => setOpeningText(event.target.value)}
          />
          <textarea
            className={`${inputClass} min-h-28 w-full resize-y`}
            value={closingText}
            disabled={isApproved}
            placeholder="클로징 문구"
            onChange={(event) => setClosingText(event.target.value)}
          />
          <Button disabled={isSubmitting || isApproved} onClick={() => run(saveMetadata)}>
            문구 저장
          </Button>
        </Card>

        <div className="space-y-md">
          {days.map((day) => (
            <Card key={day.id} className="space-y-md">
              <div>
                <p className="text-metadata text-primary">Day {day.dayNumber}</p>
                <h2 className="text-section-title text-on-surface">
                  {day.title ?? "여행 일정"}
                </h2>
              </div>

              {day.schedules.map((schedule) => (
                <div key={schedule.id} className="space-y-sm">
                  <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                    <p className="text-secondary font-medium">
                      {schedule.time ? `${schedule.time} - ` : ""}
                      {schedule.title}
                    </p>
                    <p className="text-metadata text-on-surface-variant">
                      {schedule.location ?? "장소 미정"}
                    </p>
                  </div>

                  {schedule.uploads.map((upload, index) => {
                    const form = uploadForms[upload.id] ?? {
                      isInStorybook: upload.isInStorybook,
                      adminNote: upload.adminNote ?? "",
                    };

                    return (
                      <div
                        key={upload.id}
                        className="grid gap-sm rounded border border-outline-variant p-sm lg:grid-cols-[72px_1fr_auto]"
                      >
                        <MediaPreview files={upload.files} compact />
                        <div className="min-w-0 space-y-xs">
                          <div className="flex flex-wrap items-center gap-xs">
                            <Badge>{upload.type === "video" ? "영상" : "사진"}</Badge>
                            <Badge>{upload.user.name}</Badge>
                            <Badge
                              className={
                                form.isInStorybook
                                  ? "border-primary bg-primary-fixed text-on-primary-fixed"
                                  : ""
                              }
                            >
                              {form.isInStorybook ? "포함" : "제외"}
                            </Badge>
                          </div>
                          <p className="line-clamp-2 text-secondary text-on-surface-variant">
                            {upload.memo ?? "메모 없음"}
                          </p>
                          <textarea
                            className={`${inputClass} min-h-20 w-full resize-y`}
                            disabled={isApproved}
                            placeholder="관리자 캡션 또는 정리 메모"
                            value={form.adminNote}
                            onChange={(event) =>
                              setUploadForm(upload.id, { adminNote: event.target.value })
                            }
                          />
                        </div>
                        <div className="flex flex-row gap-xs lg:flex-col">
                          <Button
                            variant="secondary"
                            disabled={isSubmitting || isApproved || index === 0}
                            onClick={() => run(() => moveUpload(upload.id, "up"))}
                          >
                            <ArrowUp className="h-4 w-4" />
                            위
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={
                              isSubmitting ||
                              isApproved ||
                              index === schedule.uploads.length - 1
                            }
                            onClick={() => run(() => moveUpload(upload.id, "down"))}
                          >
                            <ArrowDown className="h-4 w-4" />
                            아래
                          </Button>
                          <Button
                            variant={form.isInStorybook ? "secondary" : "primary"}
                            disabled={isSubmitting || isApproved}
                            onClick={() =>
                              setUploadForm(upload.id, {
                                isInStorybook: !form.isInStorybook,
                              })
                            }
                          >
                            {form.isInStorybook ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            {form.isInStorybook ? "제외" : "포함"}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={isSubmitting || isApproved}
                            onClick={() => run(() => saveUpload(upload.id))}
                          >
                            저장
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </Card>
          ))}
        </div>
      </section>

      <aside className="space-y-md">
        <Card>
          <div className="flex items-center gap-sm">
            {isApproved ? (
              <Lock className="h-5 w-5 text-primary" />
            ) : (
              <Unlock className="h-5 w-5 text-primary" />
            )}
            <h2 className="text-section-title text-on-surface">승인 상태</h2>
          </div>
          <p className="mt-sm text-secondary text-on-surface-variant">
            {isApproved
              ? "승인 완료 상태입니다. 업로더의 추가 업로드와 수정이 잠깁니다."
              : "승인 전입니다. 포함 여부, 캡션, 표시 순서를 정리할 수 있습니다."}
          </p>
          <div className="mt-md space-y-xs text-secondary text-on-surface-variant">
            <p>전체 업로드 {uploads.length}개</p>
            <p>스토리북 포함 {includedCount}개</p>
            {storybook.approvedAt ? (
              <p>승인일 {new Date(storybook.approvedAt).toLocaleString("ko-KR")}</p>
            ) : null}
          </div>
          {isApproved ? (
            <Button
              className="mt-md w-full"
              variant="secondary"
              disabled={!isSuperAdmin || isSubmitting}
              onClick={() => run(unlock)}
            >
              승인 해제
            </Button>
          ) : (
            <Button
              className="mt-md w-full"
              disabled={isSubmitting}
              onClick={() => run(approve)}
            >
              <CheckCircle2 className="h-4 w-4" />
              스토리북 승인
            </Button>
          )}
          {error ? <p className="mt-sm text-secondary text-error">{error}</p> : null}
        </Card>

        <Card>
          <h2 className="text-section-title text-on-surface">AI 검수 요약</h2>
          <p className="mt-sm text-secondary text-on-surface-variant">
            AI 검수는 다음 단계에서 슈퍼어드민 전용 Codex CLI Worker로 연결합니다.
          </p>
        </Card>

        <ShareLinkManager
          projectId={projectId}
          isApproved={isApproved}
          initialShareLinks={shareLinks}
        />
      </aside>
    </div>
  );
}
