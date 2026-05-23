import type * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded px-xs text-metadata text-on-surface-variant border border-outline-variant bg-surface-container-lowest",
        className,
      )}
      {...props}
    />
  );
}
