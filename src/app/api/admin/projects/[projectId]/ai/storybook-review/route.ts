import { NextResponse } from "next/server";
import { requireSuperAdminForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

type ReviewResult = {
  summary: string;
  privacyFlags: string[];
  captionDrafts: { scheduleTitle: string; caption: string; seconds: number }[];
  bgmKeywords: string[];
};

function localReview(notes: { scheduleTitle: string; memo: string }[]): ReviewResult {
  const joined = notes.map((note) => note.memo).join(" ");
  const meaningfulNotes = notes.filter((note) => note.memo.trim().length > 0);
  const privacyFlags = notes
    .filter((note) => /010[-\s]?\d{3,4}[-\s]?\d{4}|@|주민|여권|카드|비밀번호|주소/.test(note.memo))
    .map((note) => `${note.scheduleTitle}: 전화번호, 이메일, 신분증, 결제 정보처럼 보이는 문구를 확인해 주세요.`);

  return {
    summary:
      joined.length > 0
        ? `총 ${meaningfulNotes.length}개의 메모를 바탕으로 여행의 주요 장면, 감정 흐름, 공유 전 확인할 항목을 정리했습니다.`
        : "아직 분석할 메모가 충분하지 않습니다.",
    privacyFlags,
    captionDrafts: meaningfulNotes.slice(0, 8).map((note, index) => {
      const memo = note.memo.trim();
      return {
        scheduleTitle: note.scheduleTitle,
        caption: memo.length > 80 ? `${memo.slice(0, 80)}...` : memo,
        seconds: 5 + index * 5,
      };
    }),
    bgmKeywords:
      joined.length > 0
        ? ["따뜻한", "회상", "여행", "공동체", "잔잔한"]
        : [],
  };
}

function extractResponseText(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "output_text" in data &&
    typeof data.output_text === "string"
  ) {
    return data.output_text;
  }

  const output = (data as { output?: unknown[] } | null)?.output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    const content = (item as { content?: unknown[] } | null)?.content;
    if (!Array.isArray(content)) continue;

    for (const contentItem of content) {
      const text = (contentItem as { text?: unknown } | null)?.text;
      if (typeof text === "string") return text;
    }
  }

  return null;
}

async function callOpenAi(notes: { scheduleTitle: string; memo: string }[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return { result: localReview(notes), model: "local-rule-fallback" };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "You review Korean travel storybook notes before public sharing. Return compact Korean JSON only with keys summary, privacyFlags, captionDrafts, bgmKeywords. privacyFlags should identify sensitive personal data or risky public-sharing text. captionDrafts items need scheduleTitle, caption, seconds and should consider a calm travel video pacing of 4-7 seconds per image.",
      input: JSON.stringify({ notes }),
      text: { format: { type: "json_object" } },
    }),
  });

  if (!response.ok) {
    return { result: localReview(notes), model: `${model}-fallback` };
  }

  const data = await response.json();
  const outputText = extractResponseText(data) ?? JSON.stringify(localReview(notes));

  try {
    return { result: JSON.parse(outputText) as ReviewResult, model };
  } catch {
    return { result: localReview(notes), model: `${model}-parse-fallback` };
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { user, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      storybook: { select: { id: true } },
      uploads: {
        where: { deletedAt: null, isInStorybook: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          schedule: { select: { title: true, time: true } },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const notes = project.uploads.map((upload) => ({
    scheduleTitle: `${upload.schedule.time ? `${upload.schedule.time} ` : ""}${upload.schedule.title}`,
    memo: upload.adminNote ?? upload.memo ?? "",
  }));

  const aiJob = await prisma.aiJob.create({
    data: {
      projectId,
      storybookId: project.storybook?.id,
      requestedBy: user!.id,
      type: "storybook_review",
      status: "processing",
      inputJson: { notes },
      startedAt: new Date(),
    },
    select: { id: true },
  });

  try {
    const { result, model } = await callOpenAi(notes);
    const updated = await prisma.aiJob.update({
      where: { id: aiJob.id },
      data: {
        status: "completed",
        model,
        resultJson: result,
        completedAt: new Date(),
      },
      select: { id: true, model: true, resultJson: true },
    });

    return NextResponse.json({ aiJob: updated });
  } catch (error) {
    await prisma.aiJob.update({
      where: { id: aiJob.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "AI 검수에 실패했습니다.",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ error: "AI 검수에 실패했습니다." }, { status: 500 });
  }
}
