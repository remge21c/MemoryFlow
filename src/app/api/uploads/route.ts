import { NextResponse } from "next/server";
import { requireCurrentUserForApi } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  isAllowedImageMime,
  isAllowedVideoMime,
  saveUploadFile,
} from "@/lib/storage/local";

const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

function textValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const { user, response } = await requireCurrentUserForApi();

  if (response) {
    return response;
  }

  if (!user?.activeProjectId) {
    return NextResponse.json({ error: "활성 프로젝트를 먼저 선택해 주세요." }, { status: 400 });
  }

  const formData = await request.formData();
  const type = textValue(formData.get("type"));
  const dayId = textValue(formData.get("dayId"));
  const scheduleId = textValue(formData.get("scheduleId"));
  const memo = textValue(formData.get("memo"));
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (type !== "photo" && type !== "video") {
    return NextResponse.json({ error: "업로드 타입을 선택해 주세요." }, { status: 400 });
  }

  if (!dayId || !scheduleId) {
    return NextResponse.json({ error: "Day와 세부일정을 선택해 주세요." }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "업로드할 파일을 선택해 주세요." }, { status: 400 });
  }

  if (type === "video" && files.length !== 1) {
    return NextResponse.json({ error: "영상은 1개만 업로드할 수 있습니다." }, { status: 400 });
  }

  const projectId = user.activeProjectId;
  const [schedule, storybook, membership] = await Promise.all([
    prisma.projectSchedule.findFirst({
      where: { id: scheduleId, dayId, projectId },
      select: { id: true },
    }),
    prisma.storybook.findUnique({
      where: { projectId },
      select: { status: true },
    }),
    prisma.projectMember.findFirst({
      where: { projectId, userId: user.id, status: "active" },
      select: { role: true },
    }),
  ]);

  const canUpload = user.globalRole === "super_admin" || membership?.role === "uploader";

  if (!canUpload) {
    return NextResponse.json({ error: "업로드 권한이 없습니다." }, { status: 403 });
  }

  if (!schedule) {
    return NextResponse.json({ error: "세부일정을 찾을 수 없습니다." }, { status: 404 });
  }

  if (storybook?.status === "approved") {
    return NextResponse.json(
      { error: "스토리북 승인 후에는 업로드할 수 없습니다." },
      { status: 409 },
    );
  }

  for (const file of files) {
    if (type === "photo" && (!isAllowedImageMime(file.type) || file.size > PHOTO_MAX_BYTES)) {
      return NextResponse.json(
        { error: "사진은 jpg, png, webp, heic 형식과 장당 10MB 이하만 가능합니다." },
        { status: 400 },
      );
    }

    if (type === "video" && (!isAllowedVideoMime(file.type) || file.size > VIDEO_MAX_BYTES)) {
      return NextResponse.json(
        { error: "영상은 mp4, mov, webm 형식과 100MB 이하만 가능합니다." },
        { status: 400 },
      );
    }
  }

  const upload = await prisma.upload.create({
    data: {
      projectId,
      dayId,
      scheduleId,
      userId: user.id,
      type,
      memo: memo || null,
    },
  });

  try {
    const savedFiles = await Promise.all(
      files.map(async (file, index) => ({
        file,
        storagePath: await saveUploadFile({ projectId, uploadId: upload.id, file }),
        sortOrder: index,
      })),
    );

    await prisma.uploadFile.createMany({
      data: savedFiles.map(({ file, storagePath, sortOrder }) => ({
        uploadId: upload.id,
        fileType: type === "video" ? "video" : "image",
        storagePath,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        sortOrder,
      })),
    });
  } catch (error) {
    await prisma.upload.delete({ where: { id: upload.id } }).catch(() => null);
    throw error;
  }

  return NextResponse.json({ uploadId: upload.id }, { status: 201 });
}

