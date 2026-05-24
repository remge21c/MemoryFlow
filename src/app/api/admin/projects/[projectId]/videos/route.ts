import { NextResponse } from "next/server";
import { requireSuperAdminForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  deleteStorageFile,
  isAllowedVideoMime,
  saveProjectVideoFile,
} from "@/lib/storage/local";

const VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const videos = await prisma.projectVideo.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      title: true,
      durationSeconds: true,
      sizeBytes: true,
      status: true,
      uploadedAt: true,
    },
  });

  return NextResponse.json({
    videos: videos.map((video) => ({
      ...video,
      sizeBytes: Number(video.sizeBytes),
      durationSeconds: video.durationSeconds ? Number(video.durationSeconds) : null,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { user, response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");

  if (!title) {
    return NextResponse.json({ error: "영상 제목을 입력해 주세요." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "업로드할 영상 파일을 선택해 주세요." }, { status: 400 });
  }

  if (!isAllowedVideoMime(file.type) || file.size > VIDEO_MAX_BYTES) {
    return NextResponse.json(
      { error: "mp4, mov, webm 형식의 500MB 이하 영상만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const video = await prisma.projectVideo.create({
    data: {
      projectId,
      title,
      storagePath: "pending",
      sizeBytes: BigInt(file.size),
      uploadedBy: user!.id,
      status: "published",
    },
    select: { id: true },
  });

  try {
    const storagePath = await saveProjectVideoFile({ projectId, videoId: video.id, file });
    const updated = await prisma.projectVideo.update({
      where: { id: video.id },
      data: { storagePath },
      select: {
        id: true,
        title: true,
        sizeBytes: true,
        status: true,
        uploadedAt: true,
      },
    });

    return NextResponse.json(
      {
        video: {
          ...updated,
          sizeBytes: Number(updated.sizeBytes),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    await prisma.projectVideo.update({
      where: { id: video.id },
      data: { deletedAt: new Date(), status: "hidden" },
    });

    throw error;
  }
}

export async function DELETE(request: Request) {
  const { response } = await requireSuperAdminForApi();

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ error: "삭제할 영상이 없습니다." }, { status: 400 });
  }

  const video = await prisma.projectVideo.findUnique({
    where: { id: videoId },
    select: { id: true, storagePath: true },
  });

  if (!video) {
    return NextResponse.json({ error: "영상을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.projectVideo.update({
    where: { id: video.id },
    data: { deletedAt: new Date(), status: "hidden" },
  });
  await deleteStorageFile(video.storagePath).catch(() => null);

  return NextResponse.json({ ok: true });
}
