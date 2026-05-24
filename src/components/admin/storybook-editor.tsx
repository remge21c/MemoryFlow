"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
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

type AiReviewResult = {
  summary?: string;
  privacyFlags?: string[];
  captionDrafts?: { scheduleTitle: string; caption: string; seconds: number }[];
  bgmKeywords?: string[];
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
  const [aiReview, setAiReview] = useState<AiReviewResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploads = useMemo(
    () => days.flatMap((day) => day.schedules.flatMap((schedule) => schedule.uploads)),
    [days],
  );
  const includedCount = Object.values(uploadForms).filter((form) => form.isInStorybook).length;
  const captionedCount = Object.values(uploadForms).filter(
    (form) => form.isInStorybook && form.adminNote.trim().length > 0,
  ).length;
  const hasRequiredText = title.trim().length > 0 && openingText.trim().length > 0;
  const canApprove = includedCount > 0 && hasRequiredText;

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

  async function runAiReview() {
    const data = (await requestJson(
      `/api/admin/projects/${projectId}/ai/storybook-review`,
      "POST",
    )) as { aiJob?: { resultJson?: AiReviewResult } } | null;

    setAiReview(data?.aiJob?.resultJson ?? null);
  }

  return (
    <div className="grid gap-lg lg:grid-cols-[1fr_360px]">
      <section className="space-y-md">
        <Card className="space-y-md">
          <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-sm">
              <FileText className="mt-1 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-section-title text-on-surface">스토리북 문구</h2>
                <p className="mt-xs text-secondary text-on-surface-variant">
                  최종 공유 페이지와 이후 PDF/영상 패키지의 기본 문구로 사용됩니다.
                </p>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href="/admin/storybook/preview">
                <Eye className="h-4 w-4" />
                승인 전 미리보기
              </Link>
            </Button>
          </div>

          <label className="grid gap-xs">
            <span className="text-metadata text-on-surface-variant">스토리북 제목</span>
            <input
              className={`${inputClass} w-full`}
              value={title}
              disabled={isApproved}
              placeholder="예: 비 오는 교토에서 완성한 가족의 4일"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="grid gap-xs">
            <span className="text-metadata text-on-surface-variant">오프닝 문구</span>
            <textarea
              className={`${inputClass} min-h-24 w-full resize-y`}
              value={openingText}
              disabled={isApproved}
              placeholder="여행을 시작하는 짧은 소개 문구"
              onChange={(event) => setOpeningText(event.target.value)}
            />
          </label>
          <label className="grid gap-xs">
            <span className="text-metadata text-on-surface-variant">클로징 문구</span>
            <textarea
              className={`${inputClass} min-h-24 w-full resize-y`}
              value={closingText}
              disabled={isApproved}
              placeholder="여행을 마무리하는 문구"
              onChange={(event) => setClosingText(event.target.value)}
            />
          </label>
          <Button disabled={isSubmitting || isApproved} onClick={() => run(saveMetadata)}>
            문구 저장
          </Button>
        </Card>

        <div className="space-y-md">
          {days.map((day) => {
            const dayUploads = day.schedules.flatMap((schedule) => schedule.uploads);
            const dayIncluded = dayUploads.filter(
              (upload) => uploadForms[upload.id]?.isInStorybook,
            ).length;

            return (
              <Card key={day.id} className="space-y-md">
                <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-xs">
                      <Badge className="border-primary text-primary">Day {day.dayNumber}</Badge>
                      <Badge>
                        포함 {dayIncluded}/{dayUploads.length}
                      </Badge>
                    </div>
                    <h2 className="mt-sm text-section-title text-on-surface">
                      {day.title ?? "여행 일정"}
                    </h2>
                  </div>
                </div>

                {day.schedules.map((schedule) => (
                  <div key={schedule.id} className="space-y-sm">
                    <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                      <p className="text-secondary font-medium">
                        {schedule.time ? `${schedule.time} - ` : ""}
                        {schedule.title}
                      </p>
                      <p className="text-metadata text-on-surface-variant">
                        {schedule.location ?? "장소 미정"} · 업로드 {schedule.uploads.length}개
                      </p>
                    </div>

                    {schedule.uploads.length === 0 ? (
                      <p className="rounded border border-dashed border-outline-variant p-sm text-secondary text-on-surface-variant">
                        이 세부일정에는 아직 업로드가 없습니다.
                      </p>
                    ) : null}

                    {schedule.uploads.map((upload, index) => {
                      const form = uploadForms[upload.id] ?? {
                        isInStorybook: upload.isInStorybook,
                        adminNote: upload.adminNote ?? "",
                      };

                      return (
                        <div
                          key={upload.id}
                          className={`grid gap-sm rounded border p-sm lg:grid-cols-[88px_1fr_auto] ${
                            form.isInStorybook
                              ? "border-outline-variant"
                              : "border-dashed border-outline-variant bg-surface-container-low"
                          }`}
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
                              {upload.memo ?? "업로더 메모 없음"}
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
                          <div className="flex flex-row flex-wrap gap-xs lg:w-28 lg:flex-col">
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isSubmitting || isApproved || index === 0}
                              onClick={() => run(() => moveUpload(upload.id, "up"))}
                            >
                              <ArrowUp className="h-4 w-4" />
                              위
                            </Button>
                            <Button
                              size="sm"
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
                              size="sm"
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
                              size="sm"
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
            );
          })}
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
            <h2 className="text-section-title text-on-surface">승인 준비 상태</h2>
          </div>
          <div className="mt-md space-y-sm">
            <ChecklistItem checked={title.trim().length > 0} label="스토리북 제목 입력" />
            <ChecklistItem checked={openingText.trim().length > 0} label="오프닝 문구 입력" />
            <ChecklistItem checked={includedCount > 0} label="포함할 업로드 1개 이상" />
            <ChecklistItem checked={captionedCount > 0} label="관리자 캡션 1개 이상" />
          </div>
          <div className="mt-md rounded border border-outline-variant bg-surface-container-lowest p-sm text-secondary text-on-surface-variant">
            <p>전체 업로드 {uploads.length}개</p>
            <p>스토리북 포함 {includedCount}개</p>
            <p>캡션 작성 {captionedCount}개</p>
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
              disabled={isSubmitting || !canApprove}
              onClick={() => run(approve)}
            >
              <CheckCircle2 className="h-4 w-4" />
              스토리북 승인
            </Button>
          )}
          {!canApprove && !isApproved ? (
            <p className="mt-xs text-metadata text-on-surface-variant">
              제목, 오프닝 문구, 포함 업로드가 있어야 승인할 수 있습니다.
            </p>
          ) : null}
          {error ? <p className="mt-sm text-secondary text-error">{error}</p> : null}
        </Card>

        <Card>
          <div className="flex items-center gap-sm">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-section-title text-on-surface">AI 검수</h2>
          </div>
          <p className="mt-sm text-secondary text-on-surface-variant">
            슈퍼관리자 전용으로 메모 요약, 민감정보 의심 문구, 영상 자막 초안을 검토합니다.
          </p>
          <Button
            className="mt-md w-full"
            variant="secondary"
            disabled={!isSuperAdmin || isSubmitting || uploads.length === 0}
            onClick={() => run(runAiReview)}
          >
            <Sparkles className="h-4 w-4" />
            AI 검수 실행
          </Button>
          {aiReview ? (
            <div className="mt-md space-y-sm rounded border border-outline-variant bg-surface-container-lowest p-sm">
              <div>
                <p className="text-metadata text-on-surface-variant">요약</p>
                <p className="text-secondary text-on-surface">{aiReview.summary}</p>
              </div>
              <div>
                <p className="text-metadata text-on-surface-variant">민감정보 의심</p>
                <p className="text-secondary text-on-surface">
                  {aiReview.privacyFlags?.length
                    ? aiReview.privacyFlags.join(" / ")
                    : "의심 문구 없음"}
                </p>
              </div>
              <div>
                <p className="text-metadata text-on-surface-variant">자막 초안</p>
                <div className="mt-xs space-y-xs">
                  {(aiReview.captionDrafts ?? []).slice(0, 3).map((draft) => (
                    <p key={`${draft.scheduleTitle}-${draft.seconds}`} className="text-secondary">
                      {draft.seconds}s · {draft.scheduleTitle}: {draft.caption}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-metadata text-on-surface-variant">BGM 키워드</p>
                <div className="mt-xs flex flex-wrap gap-xs">
                  {(aiReview.bgmKeywords ?? []).map((keyword) => (
                    <Badge key={keyword}>{keyword}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
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

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-sm text-secondary">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded border ${
          checked
            ? "border-primary bg-primary text-on-primary"
            : "border-outline-variant bg-surface-container-lowest"
        }`}
      >
        {checked ? <CheckCircle2 className="h-4 w-4" /> : null}
      </span>
      <span className={checked ? "text-on-surface" : "text-on-surface-variant"}>{label}</span>
    </div>
  );
}
