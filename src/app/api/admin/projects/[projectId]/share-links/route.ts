import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProjectManagerForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  createShareToken,
  expiresAtForDays,
  hashShareToken,
  isShareLinkExpiryDays,
} from "@/lib/share-links/token";

const createShareLinkSchema = z.object({
  expiresInDays: z.number().int(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const shareLinks = await prisma.shareLink.findMany({
    where: { projectId, type: "storybook" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      disabledAt: true,
      creator: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json({ shareLinks });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { user, response } = await requireProjectManagerForApi(projectId);

  if (response) {
    return response;
  }

  const parsed = createShareLinkSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success || !isShareLinkExpiryDays(parsed.data.expiresInDays)) {
    return NextResponse.json({ error: "만료 기간을 다시 선택해 주세요." }, { status: 400 });
  }

  const storybook = await prisma.storybook.findUnique({
    where: { projectId },
    select: { status: true },
  });

  if (storybook?.status !== "approved") {
    return NextResponse.json(
      { error: "승인된 스토리북만 공유 링크를 발급할 수 있습니다." },
      { status: 409 },
    );
  }

  const token = createShareToken();
  const tokenHash = hashShareToken(token);

  const shareLink = await prisma.shareLink.create({
    data: {
      tokenHash,
      projectId,
      type: "storybook",
      expiresAt: expiresAtForDays(parsed.data.expiresInDays),
      createdBy: user!.id,
    },
    select: {
      id: true,
      type: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      disabledAt: true,
    },
  });

  return NextResponse.json(
    {
      shareLink,
      token,
      path: `/share/${token}`,
    },
    { status: 201 },
  );
}

