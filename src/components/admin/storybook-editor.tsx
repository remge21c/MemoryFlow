"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Maximize2,
  Music2,
  ShieldCheck,
  Sparkles,
  Unlock,
  Video,
  X,
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

type MediaFile = Upload["files"][number];

type MediaLightboxState = {
  files: MediaFile[];
  index: number;
  title: string;
  memo: string | null;
} | null;

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
  initialAiReview: {
    model: string | null;
    completedAt: string | null;
    result: AiReviewResult | null;
  } | null;
};

export type AiReviewResult = {
  summary?: string;
  privacyFlags?: string[];
  captionDrafts?: { scheduleTitle: string; caption: string; seconds: number }[];
  bgmKeywords?: string[];
};

type AiReviewResponse = {
  aiJob?: {
    model?: string | null;
    resultJson?: AiReviewResult;
  };
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
  initialAiReview,
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
  const [aiReview, setAiReview] = useState<AiReviewResult | null>(
    initialAiReview?.result ?? null,
  );
  const [aiReviewModel, setAiReviewModel] = useState<string | null>(
    initialAiReview?.model ?? null,
  );
  const [aiReviewRanAt, setAiReviewRanAt] = useState<string | null>(
    initialAiReview?.completedAt ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaLightbox, setMediaLightbox] = useState<MediaLightboxState>(null);

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
  const aiPrivacyFlagCount = aiReview?.privacyFlags?.length ?? 0;
  const aiCaptionDraftCount = aiReview?.captionDrafts?.length ?? 0;
  const aiBgmKeywordCount = aiReview?.bgmKeywords?.length ?? 0;

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
    )) as AiReviewResponse | null;

    setAiReview(data?.aiJob?.resultJson ?? null);
    setAiReviewModel(data?.aiJob?.model ?? null);
    setAiReviewRanAt(new Date().toISOString());
  }

  function openMediaLightbox(upload: Upload, title: string, index = 0) {
    if (upload.files.length === 0) return;

    setMediaLightbox({
      files: upload.files,
      index,
      title,
      memo: upload.memo,
    });
  }

  function moveLightbox(direction: "previous" | "next") {
    setMediaLightbox((current) => {
      if (!current) return current;

      const nextIndex =
        direction === "previous"
          ? (current.index - 1 + current.files.length) % current.files.length
          : (current.index + 1) % current.files.length;

      return { ...current, index: nextIndex };
    });
  }

  function selectLightboxIndex(index: number) {
    setMediaLightbox((current) => (current ? { ...current, index } : current));
  }

  return (
    <>
      <div className="grid gap-lg lg:grid-cols-[minmax(0,1fr)_360px]">
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
                          className={`grid gap-md rounded border p-sm xl:grid-cols-[minmax(320px,45%)_1fr_auto] ${
                            form.isInStorybook
                              ? "border-outline-variant"
                              : "border-dashed border-outline-variant bg-surface-container-low"
                          }`}
                        >
                          <button
                            type="button"
                            className="group relative block overflow-hidden rounded border border-outline-variant bg-surface-container-lowest text-left focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={() => openMediaLightbox(upload, schedule.title)}
                            aria-label="미디어 크게 보기"
                          >
                            <MediaPreview
                              files={upload.files}
                              className="aspect-[16/10] min-h-[220px] w-full"
                            />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-sm bg-black/55 px-sm py-xs text-white opacity-100 transition-opacity group-hover:opacity-100">
                              <span className="text-metadata">
                                {upload.files.length > 1
                                  ? `${upload.files.length}개 미디어 보기`
                                  : "크게 보기"}
                              </span>
                              <Maximize2 className="h-4 w-4" />
                            </div>
                          </button>
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
                          <div className="flex flex-row flex-wrap gap-xs xl:w-28 xl:flex-col">
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

        <Card className="space-y-md">
          <div className="flex items-start gap-sm">
            <Sparkles className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-section-title text-on-surface">AI 검수</h2>
              <p className="mt-xs text-secondary text-on-surface-variant">
                승인 전 메모 요약, 민감정보 의심 문구, 영상 자막 초안, BGM 키워드를 한 번에
                확인합니다.
              </p>
            </div>
          </div>

          <div className="grid gap-xs">
            <ChecklistItem checked={Boolean(aiReview)} label="AI 검수 결과 확인" />
            <ChecklistItem checked={aiPrivacyFlagCount === 0 && Boolean(aiReview)} label="민감정보 경고 확인" />
            <ChecklistItem checked={aiCaptionDraftCount > 0} label="영상 자막 후보 생성" />
            <ChecklistItem checked={aiBgmKeywordCount > 0} label="BGM 키워드 생성" />
          </div>

          {!isSuperAdmin ? (
            <p className="rounded border border-outline-variant bg-surface-container-lowest p-sm text-secondary text-on-surface-variant">
              AI 검수는 슈퍼관리자 전용입니다. 프로젝트 관리자는 직접 편집과 승인만 진행할 수 있습니다.
            </p>
          ) : null}

          <Button
            className="w-full"
            variant="secondary"
            disabled={!isSuperAdmin || isSubmitting || uploads.length === 0}
            onClick={() => run(runAiReview)}
          >
            <Sparkles className="h-4 w-4" />
            {aiReview ? "AI 검수 다시 실행" : "AI 검수 실행"}
          </Button>

          {aiReview ? (
            <div className="space-y-sm">
              <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                <div className="flex flex-wrap items-center gap-xs">
                  <Badge className="border-primary text-primary">
                    {aiReviewModel?.includes("fallback") ? "로컬 검수" : "AI 검수"}
                  </Badge>
                  {aiReviewModel ? <Badge>{aiReviewModel}</Badge> : null}
                  {aiReviewRanAt ? (
                    <Badge>{new Date(aiReviewRanAt).toLocaleTimeString("ko-KR")}</Badge>
                  ) : null}
                </div>
                <p className="mt-sm text-metadata text-on-surface-variant">요약</p>
                <p className="mt-xs text-secondary text-on-surface">
                  {aiReview.summary ?? "요약 결과가 없습니다."}
                </p>
              </div>

              <div
                className={`rounded border p-sm ${
                  aiPrivacyFlagCount > 0
                    ? "border-error bg-error-container text-on-error-container"
                    : "border-outline-variant bg-surface-container-lowest"
                }`}
              >
                <div className="flex items-center gap-xs">
                  {aiPrivacyFlagCount > 0 ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  )}
                  <p className="text-metadata">
                    민감정보 의심 {aiPrivacyFlagCount > 0 ? `${aiPrivacyFlagCount}건` : "없음"}
                  </p>
                </div>
                <div className="mt-xs space-y-xs">
                  {aiPrivacyFlagCount > 0 ? (
                    aiReview.privacyFlags?.map((flag) => (
                      <p key={flag} className="text-secondary">
                        {flag}
                      </p>
                    ))
                  ) : (
                    <p className="text-secondary text-on-surface-variant">
                      전화번호, 이메일, 여권, 카드, 비밀번호처럼 보이는 문구가 발견되지 않았습니다.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                <div className="flex items-center gap-xs">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <p className="text-metadata text-on-surface-variant">
                    영상 자막 후보 {aiCaptionDraftCount}개
                  </p>
                </div>
                <div className="mt-sm space-y-xs">
                  {(aiReview.captionDrafts ?? []).slice(0, 5).map((draft) => (
                    <div
                      key={`${draft.scheduleTitle}-${draft.seconds}-${draft.caption}`}
                      className="rounded border border-outline-variant bg-surface p-xs"
                    >
                      <div className="flex flex-wrap items-center gap-xs">
                        <Badge>{draft.seconds}s</Badge>
                        <p className="text-metadata text-on-surface-variant">
                          {draft.scheduleTitle}
                        </p>
                      </div>
                      <p className="mt-xs text-secondary text-on-surface">{draft.caption}</p>
                    </div>
                  ))}
                  {aiCaptionDraftCount === 0 ? (
                    <p className="text-secondary text-on-surface-variant">
                      자막 후보를 만들 메모가 부족합니다.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded border border-outline-variant bg-surface-container-lowest p-sm">
                <div className="flex items-center gap-xs">
                  <Music2 className="h-4 w-4 text-primary" />
                  <p className="text-metadata text-on-surface-variant">BGM 키워드</p>
                </div>
                <div className="mt-xs flex flex-wrap gap-xs">
                  {(aiReview.bgmKeywords ?? []).map((keyword) => (
                    <Badge key={keyword}>{keyword}</Badge>
                  ))}
                  {aiBgmKeywordCount === 0 ? (
                    <p className="text-secondary text-on-surface-variant">
                      추천 키워드가 없습니다.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-metadata text-on-surface-variant">
              API 키가 없어도 로컬 검수 결과로 UX를 확인할 수 있고, 운영 환경에서
              OPENAI_API_KEY를 설정하면 실제 AI 검수 결과가 표시됩니다.
            </p>
          )}
        </Card>

        <ShareLinkManager
          projectId={projectId}
          isApproved={isApproved}
          initialShareLinks={shareLinks}
        />
        </aside>
      </div>

      {mediaLightbox ? (
        <MediaLightbox
          state={mediaLightbox}
          onClose={() => setMediaLightbox(null)}
          onMove={moveLightbox}
          onSelect={selectLightboxIndex}
        />
      ) : null}
    </>
  );
}

function MediaLightbox({
  state,
  onClose,
  onMove,
  onSelect,
}: {
  state: NonNullable<MediaLightboxState>;
  onClose: () => void;
  onMove: (direction: "previous" | "next") => void;
  onSelect: (index: number) => void;
}) {
  const currentFile = state.files[state.index];
  const src = `/api/media/${currentFile.id}`;
  const hasMultipleFiles = state.files.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-16 items-center justify-between gap-md border-b border-white/15 px-md py-sm">
        <div className="min-w-0">
          <p className="truncate text-section-title">{state.title}</p>
          <p className="text-metadata text-white/70">
            {state.index + 1}/{state.files.length}
            {state.memo ? ` · ${state.memo}` : ""}
          </p>
        </div>
        <Button variant="secondary" type="button" onClick={onClose}>
          <X className="h-4 w-4" />
          닫기
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-md">
        {hasMultipleFiles ? (
          <Button
            type="button"
            variant="secondary"
            className="absolute left-md top-1/2 z-10 -translate-y-1/2"
            onClick={() => onMove("previous")}
            aria-label="이전 미디어"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : null}

        <div className="flex h-full w-full items-center justify-center">
          {currentFile.fileType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              className="max-h-full max-w-full rounded object-contain shadow-2xl"
            />
          ) : (
            <video
              src={src}
              className="max-h-full max-w-full rounded object-contain shadow-2xl"
              controls
              autoPlay
              preload="metadata"
            />
          )}
        </div>

        {hasMultipleFiles ? (
          <Button
            type="button"
            variant="secondary"
            className="absolute right-md top-1/2 z-10 -translate-y-1/2"
            onClick={() => onMove("next")}
            aria-label="다음 미디어"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        ) : null}
      </div>

      {hasMultipleFiles ? (
        <div className="flex gap-xs overflow-x-auto border-t border-white/15 px-md py-sm">
          {state.files.map((file, index) => (
            <button
              key={file.id}
              type="button"
              className={`h-16 w-20 shrink-0 overflow-hidden rounded border ${
                index === state.index ? "border-primary" : "border-white/20"
              }`}
              onClick={() => onSelect(index)}
              aria-label={`${index + 1}번째 미디어 보기`}
            >
              {file.fileType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${file.id}`}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/10">
                  <Video className="h-5 w-5" />
                </div>
              )}
            </button>
          ))}
        </div>
      ) : null}
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
