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

export function MediaPreview({
  files,
  srcPrefix = "/api/media",
  className,
  compact = false,
}: MediaPreviewProps) {
  const firstFile = files[0];
  const src = firstFile ? `${srcPrefix}/${firstFile.id}` : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded bg-surface-container",
        compact ? "h-[72px] w-[72px]" : "aspect-[4/3] w-full",
        className,
      )}
    >
      {firstFile?.fileType === "image" && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
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

      {files.length > 1 ? (
        <Badge className="absolute bottom-xs right-xs border-primary bg-primary text-on-primary">
          +{files.length - 1}
        </Badge>
      ) : null}
    </div>
  );
}
