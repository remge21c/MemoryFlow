import Link from "next/link";
import { redirect } from "next/navigation";
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
} from "lucide-react";
import { LogoutIconButton } from "@/components/app/logout-icon-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { getActiveProjectSummary } from "@/lib/projects/current";
import { cn } from "@/lib/utils";

const userNav = [
  { label: "홈", href: "/", icon: Home },
  { label: "업로드", href: "/upload", icon: Upload },
  { label: "스토리북", href: "/storybook", icon: BookOpen },
];

const adminNav = [
  { label: "프로젝트 관리", href: "/admin/projects", icon: Layers3, superAdminOnly: true },
  { label: "회원 승인", href: "/admin/members", icon: ImagePlus, superAdminOnly: true },
  { label: "일정 관리", href: "/admin/schedules", icon: CalendarDays },
  { label: "스토리북 승인", href: "/admin/storybook", icon: ShieldCheck },
  { label: "산출물 갤러리", href: "/admin/gallery", icon: Film, superAdminOnly: true },
];

function destinationForStatus(status: string) {
  if (status === "pending") return "/pending";
  if (status === "rejected") return "/rejected";
  if (status === "inactive") return "/inactive";
  return null;
}

async function getAdminStartPath(user: {
  id: string;
  globalRole: "super_admin" | null;
  activeProjectId: string | null;
}) {
  if (user.globalRole === "super_admin") {
    return "/admin/projects";
  }

  if (!user.activeProjectId) {
    return null;
  }

  const managerMembership = await prisma.projectMember.findFirst({
    where: {
      userId: user.id,
      projectId: user.activeProjectId,
      role: "project_manager",
      status: "active",
    },
    select: { id: true },
  });

  return managerMembership ? "/admin/schedules" : null;
}

async function canUseUpload(user: {
  id: string;
  globalRole: "super_admin" | null;
  activeProjectId: string | null;
}) {
  if (user.globalRole === "super_admin") {
    return true;
  }

  if (!user.activeProjectId) {
    return false;
  }

  const uploaderMembership = await prisma.projectMember.findFirst({
    where: {
      userId: user.id,
      projectId: user.activeProjectId,
      role: "uploader",
      status: "active",
    },
    select: { id: true },
  });

  return Boolean(uploaderMembership);
}

export async function AppShell({
  children,
  title,
  section = "user",
}: {
  children: React.ReactNode;
  title: string;
  section?: "user" | "admin";
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const statusDestination = destinationForStatus(currentUser.status);

  if (statusDestination) {
    redirect(statusDestination);
  }

  const adminStartPath = await getAdminStartPath(currentUser);
  const uploadAllowed = await canUseUpload(currentUser);
  const visibleUserNav = uploadAllowed
    ? userNav
    : userNav.filter((item) => item.href !== "/upload");
  const navItems =
    section === "admin"
      ? adminNav.filter((item) => currentUser.globalRole === "super_admin" || !item.superAdminOnly)
      : adminStartPath
        ? [...visibleUserNav, { label: "관리자", href: adminStartPath, icon: ShieldCheck }]
        : visibleUserNav;
  const activeProject = await getActiveProjectSummary(currentUser);
  const activeProjectName = activeProject?.name ?? "활성 프로젝트 없음";
  const activeProjectOrg = activeProject?.orgName ?? "프로젝트 설정에서 선택";

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
            {activeProjectName}
          </p>
          <p className="mt-1 text-metadata text-on-surface-variant">{activeProjectOrg}</p>
        </div>

        <nav className="flex-1 space-y-base p-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.href.startsWith("/admin") ? "admin-entry-link" : undefined}
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
              <p className="truncate text-secondary font-semibold">{currentUser.name}</p>
              <p className="truncate text-metadata text-on-surface-variant">{currentUser.email}</p>
            </div>
            <Link
              href="/settings"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              aria-label="설정"
              title="설정"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <LogoutIconButton />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-outline-variant bg-surface/95 px-md backdrop-blur-none lg:px-lg">
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-screen-title text-primary">{title}</p>
            <p className="truncate text-metadata text-on-surface-variant">
              {activeProjectName} / {activeProjectOrg}
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-sm lg:hidden">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-primary text-secondary font-semibold text-on-primary">
              MF
            </div>
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-on-surface">MemoryFlow</p>
              <p className="truncate text-metadata text-on-surface-variant">
                {activeProjectName} / {activeProjectOrg}
              </p>
            </div>
          </div>
          <div className="lg:hidden">
            <LogoutIconButton />
          </div>
          <Link
            href="/settings/project"
            className="hidden h-tap-target items-center rounded border border-outline-variant px-sm text-metadata text-on-surface-variant lg:flex"
          >
            프로젝트 설정
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl px-md py-lg pb-32 lg:px-lg lg:pb-lg">
          {children}
        </main>
      </div>

      {section === "user" ? (
        <nav
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 grid border-t border-outline-variant bg-surface-container-lowest px-xs lg:hidden",
            adminStartPath ? "grid-cols-5" : "grid-cols-4",
          )}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.href.startsWith("/admin") ? "admin-entry-link" : undefined}
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
