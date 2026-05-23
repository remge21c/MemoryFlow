import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

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

