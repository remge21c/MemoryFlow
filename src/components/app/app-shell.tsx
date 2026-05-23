import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Home,
  ImagePlus,
  LogOut,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { activeProject } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const userNav = [
  { label: "홈", href: "/", icon: Home },
  { label: "업로드", href: "/upload", icon: Upload },
  { label: "스토리북", href: "/storybook", icon: BookOpen },
];

const adminNav = [
  { label: "일정 관리", href: "/admin/schedules", icon: CalendarDays },
  { label: "스토리북 승인", href: "/admin/storybook", icon: ShieldCheck },
  { label: "회원 승인", href: "/admin/members", icon: ImagePlus },
];

export function AppShell({
  children,
  title,
  section = "user",
}: {
  children: React.ReactNode;
  title: string;
  section?: "user" | "admin";
}) {
  const navItems = section === "admin" ? adminNav : userNav;

  return (
    <div className="min-h-dvh bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-64 border-r border-outline-variant bg-surface-container-lowest lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-sm border-b border-outline-variant px-md">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-on-primary">
            MF
          </div>
          <div>
            <p className="text-body font-semibold">MemoryFlow</p>
            <p className="text-metadata text-on-surface-variant">기록을 정리하는 곳</p>
          </div>
        </div>

        <div className="border-b border-outline-variant px-md py-sm">
          <p className="text-metadata text-on-surface-variant">현재 프로젝트</p>
          <p className="korean-text mt-base text-secondary font-medium text-on-surface">
            {activeProject.name}
          </p>
          <p className="mt-1 text-metadata text-on-surface-variant">{activeProject.orgName}</p>
        </div>

        <nav className="flex-1 space-y-base p-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex h-tap-target items-center gap-sm rounded px-sm text-secondary text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                item.href === "/" && section === "user"
                  ? "border border-primary bg-primary-fixed text-on-primary-fixed"
                  : "",
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={2} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-outline-variant p-md">
          <div className="flex items-center gap-sm">
            <div className="h-10 w-10 rounded-full bg-primary-fixed" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-secondary font-semibold">슈퍼 관리자</p>
              <p className="truncate text-metadata text-on-surface-variant">admin@memoryflow.local</p>
            </div>
            <Settings className="h-5 w-5 text-on-surface-variant" />
            <LogOut className="h-5 w-5 text-on-surface-variant" />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-outline-variant bg-surface/95 px-md backdrop-blur-none lg:px-lg">
          <div className="min-w-0">
            <p className="truncate text-screen-title text-primary">{title}</p>
            <p className="truncate text-metadata text-on-surface-variant">
              {activeProject.name} / {activeProject.orgName}
            </p>
          </div>
          <Link
            href="/settings/project"
            className="hidden h-tap-target items-center rounded border border-outline-variant px-sm text-metadata text-on-surface-variant lg:flex"
          >
            프로젝트 설정
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl px-md py-lg pb-24 lg:px-lg">
          {children}
        </main>
      </div>

      {section === "user" ? (
        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-outline-variant bg-surface-container-lowest px-xs lg:hidden">
          {userNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-16 flex-col items-center justify-center gap-base text-metadata text-on-surface-variant"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/settings"
            className="flex h-16 flex-col items-center justify-center gap-base text-metadata text-on-surface-variant"
          >
            <Settings className="h-5 w-5" />
            설정
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
