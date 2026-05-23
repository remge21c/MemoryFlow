import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-md py-xl">
      <div className="w-full max-w-md">
        <div className="mb-lg flex items-center gap-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-on-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-body font-semibold text-on-surface">MemoryFlow</p>
            <p className="text-metadata text-on-surface-variant">기록을 정리하는 곳</p>
          </div>
        </div>

        <Card className="p-lg">
          <h1 className="text-screen-title text-on-surface">{title}</h1>
          <p className="mt-xs text-secondary text-on-surface-variant">{description}</p>
          <div className="mt-lg">{children}</div>
          {footer ? (
            <div className="mt-lg border-t border-outline-variant pt-md text-secondary text-on-surface-variant">
              {footer}
            </div>
          ) : null}
        </Card>

        <p className="mt-md text-center text-metadata text-on-surface-variant">
          <Link href="/" className="text-primary">
            MemoryFlow 홈으로
          </Link>
        </p>
      </div>
    </main>
  );
}
