import path from "node:path";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

const imageExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

const videoExtensions: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

export function getLocalStorageRoot() {
  return path.resolve(process.env.LOCAL_STORAGE_ROOT ?? "./storage");
}

export function extensionForMime(mimeType: string) {
  return imageExtensions[mimeType] ?? videoExtensions[mimeType] ?? "";
}

export function isAllowedImageMime(mimeType: string) {
  return mimeType in imageExtensions;
}

export function isAllowedVideoMime(mimeType: string) {
  return mimeType in videoExtensions;
}

export function mimeForStoragePath(storagePath: string) {
  const extension = path.extname(storagePath).toLowerCase();
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".webm") return "video/webm";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".heic") return "image/heic";
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".doc") return "application/msword";
  if (extension === ".pdf") return "application/pdf";
  return "video/mp4";
}

export async function saveUploadFile({
  projectId,
  uploadId,
  file,
}: {
  projectId: string;
  uploadId: string;
  file: File;
}) {
  const extension = extensionForMime(file.type);
  const fileName = `${randomUUID()}${extension}`;
  const relativePath = path.posix.join("projects", projectId, "uploads", uploadId, fileName);
  const absolutePath = path.join(getLocalStorageRoot(), relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return relativePath;
}

export async function saveProjectVideoFile({
  projectId,
  videoId,
  file,
}: {
  projectId: string;
  videoId: string;
  file: File;
}) {
  const extension = extensionForMime(file.type);
  const fileName = `${randomUUID()}${extension}`;
  const relativePath = path.posix.join("projects", projectId, "videos", videoId, fileName);
  const absolutePath = path.join(getLocalStorageRoot(), relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return relativePath;
}

export async function saveOutputFile({
  projectId,
  outputId,
  fileName,
  bytes,
}: {
  projectId: string;
  outputId: string;
  fileName: string;
  bytes: Buffer;
}) {
  const relativePath = path.posix.join("projects", projectId, "outputs", outputId, fileName);
  const absolutePath = path.join(getLocalStorageRoot(), relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);

  return relativePath;
}

export async function deleteStorageFile(storagePath: string) {
  const absolutePath = resolveStoragePath(storagePath);
  await rm(absolutePath, { force: true });
}

export function resolveStoragePath(storagePath: string) {
  const root = getLocalStorageRoot();
  const absolutePath = path.resolve(root, storagePath);

  if (!absolutePath.startsWith(root)) {
    throw new Error("Invalid storage path");
  }

  return absolutePath;
}

function parseRange(rangeHeader: string | null, size: number) {
  if (!rangeHeader?.startsWith("bytes=")) {
    return null;
  }

  const [rawStart, rawEnd] = rangeHeader.replace("bytes=", "").split("-");
  const start = rawStart ? Number.parseInt(rawStart, 10) : 0;
  const end = rawEnd ? Number.parseInt(rawEnd, 10) : size - 1;

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    end >= size ||
    start > end
  ) {
    return null;
  }

  return { start, end };
}

export async function createMediaResponse({
  storagePath,
  mimeType,
  rangeHeader,
}: {
  storagePath: string;
  mimeType: string;
  rangeHeader: string | null;
}) {
  const absolutePath = resolveStoragePath(storagePath);
  const fileStat = await stat(absolutePath);
  const range = parseRange(rangeHeader, fileStat.size);

  if (range) {
    const stream = createReadStream(absolutePath, range);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(range.end - range.start + 1),
        "Content-Range": `bytes ${range.start}-${range.end}/${fileStat.size}`,
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  const stream = createReadStream(absolutePath);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileStat.size),
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
