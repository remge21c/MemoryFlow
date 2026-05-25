import { Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MediaFile = {
  id: string;
  fileType: "image" | "video";
  mimeType?: string | null;
};

type MediaPreviewProps = {
  files: MediaFile[];
  srcPrefix?: string;
  className?: string;
  compact?: boolean;
};

function getPhotoTileClass(index: number, total: number) {
  if (total === 1) {
    return "col-span-2 row-span-2";
  }

  if (total === 2) {
    return "row-span-2";
  }

  if (total === 3 && index === 0) {
    return "row-span-2";
  }

  return "";
}

export function MediaPreview({
  files,
  srcPrefix = "/api/media",
  className,
  compact = false,
}: MediaPreviewProps) {
  const firstFile = files[0];
  const src = firstFile ? `${srcPrefix}/${firstFile.id}` : null;
  const isPhotoGroup = firstFile?.fileType === "image";
  const visiblePhotos = isPhotoGroup ? files.slice(0, 4) : [];
  const hiddenPhotoCount = Math.max(files.length - visiblePhotos.length, 0);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded bg-surface-container",
        compact ? "h-[72px] w-[72px]" : "aspect-[4/3] w-full",
        className,
      )}
    >
      {isPhotoGroup ? (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-outline-variant">
          {visiblePhotos.map((file, index) => (
            <div
              key={file.id}
              className={cn(
                "relative min-h-0 min-w-0 overflow-hidden bg-surface-container",
                getPhotoTileClass(index, files.length),
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${srcPrefix}/${file.id}`}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {hiddenPhotoCount > 0 && index === visiblePhotos.length - 1 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-section-title font-semibold text-white">
                  +{hiddenPhotoCount}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {firstFile?.fileType === "video" && src ? (
        <video
          src={src}
          className="h-full w-full object-cover"
          controls={!compact}
          preload="metadata"
        />
      ) : null}

      {!firstFile ? (
        <div className="flex h-full w-full items-center justify-center text-metadata text-on-surface-variant">
          파일 없음
        </div>
      ) : null}

      {firstFile?.fileType === "video" && compact ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface">
            <Video className="h-4 w-4" />
          </div>
        </div>
      ) : null}

      {files.length > 1 && !isPhotoGroup ? (
        <Badge className="absolute bottom-xs right-xs border-primary bg-primary text-on-primary">
          +{files.length - 1}
        </Badge>
      ) : null}
    </div>
  );
}
