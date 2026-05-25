"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Film,
  Home,
  ImagePlus,
  Layers3,
  Settings,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  bookOpen: BookOpen,
  calendarDays: CalendarDays,
  film: Film,
  home: Home,
  imagePlus: ImagePlus,
  layers3: Layers3,
  settings: Settings,
  shieldCheck: ShieldCheck,
  upload: Upload,
} satisfies Record<string, LucideIcon>;

export type AppNavIcon = keyof typeof icons;

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavLink({
  href,
  icon,
  label,
  testId,
  variant = "sidebar",
}: {
  href: string;
  icon: AppNavIcon;
  label: string;
  testId?: string;
  variant?: "sidebar" | "mobile";
}) {
  const pathname = usePathname();
  const Icon = icons[icon];
  const active = isActivePath(pathname, href);

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        data-testid={testId}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-16 flex-col items-center justify-center gap-base text-metadata text-on-surface-variant",
          active ? "text-primary" : "",
        )}
      >
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring flex h-tap-target items-center gap-sm rounded px-sm text-secondary text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
        active ? "border border-primary bg-primary-fixed text-on-primary-fixed" : "",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
      {label}
    </Link>
  );
}

