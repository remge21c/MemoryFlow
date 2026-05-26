import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { AppNavLink, type AppNavIcon } from "@/components/app/app-nav-link";
import { LogoutIconButton } from "@/components/app/logout-icon-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { getActiveProjectSummary } from "@/lib/projects/current";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: AppNavIcon;
  superAdminOnly?: boolean;
};

const userNav = [
  { label: "홈", href: "/", icon: "home" },
  { label: "업로드", href: "/upload", icon: "upload" },
  { label: "스토리북", href: "/storybook", icon: "bookOpen" },
] satisfies NavItem[];

const adminNav = [
  { label: "프로젝트 관리", href: "/admin/projects", icon: "layers3", superAdminOnly: true },
  { label: "회원 승인", href: "/admin/members", icon: "imagePlus", superAdminOnly: true },
  { label: "일정 관리", href: "/admin/schedules", icon: "calendarDays" },
  { label: "스토리북 승인", href: "/admin/storybook", icon: "shieldCheck" },
  { label: "산출물 갤러리", href: "/admin/gallery", icon: "film", superAdminOnly: true },
] satisfies NavItem[];

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
  const managerNavItem: NavItem = {
    label: "관리자",
    href: adminStartPath ?? "/admin/schedules",
    icon: "shieldCheck",
  };
  const navItems: NavItem[] =
    section === "admin"
      ? adminNav.filter((item) => currentUser.globalRole === "super_admin" || !item.superAdminOnly)
      : adminStartPath
        ? [...visibleUserNav, managerNavItem]
        : visibleUserNav;
  const activeProject = await getActiveProjectSummary(currentUser);
  const activeProjectName = activeProject?.name ?? "활성 프로젝트 없음";
  const activeProjectDescription =
    activeProject?.description?.trim() || activeProject?.orgName || "프로젝트 설정에서 선택";

  return (
    <div className="min-h-dvh bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-64 border-r border-outline-variant bg-surface-container-lowest lg:flex lg:flex-col">
        <Link
          href="/"
          className="focus-ring flex h-16 items-center gap-sm border-b border-outline-variant px-md hover:bg-surface-container-low"
          aria-label="MemoryFlow 홈"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-white">
            MF
          </div>
          <div>
            <p className="text-section-title font-semibold text-on-surface">MemoryFlow</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-base p-sm pt-md">
          {navItems.map((item) => (
            <AppNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              testId={item.href.startsWith("/admin") ? "admin-entry-link" : undefined}
            />
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
            <p className="truncate text-secondary font-medium text-primary">
              {activeProjectName} / {activeProjectDescription}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-sm lg:hidden">
            <Link
              href="/"
              className="focus-ring flex shrink-0 items-center gap-sm rounded hover:bg-surface-container-low"
              aria-label="MemoryFlow 홈"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded bg-primary text-secondary font-semibold text-white">
                MF
              </div>
              <p className="text-section-title font-semibold text-on-surface">MemoryFlow</p>
            </Link>
            <p className="min-w-0 truncate border-l border-outline-variant pl-sm text-secondary font-medium text-primary">
              {activeProjectName}
            </p>
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

        <main
          aria-label={title}
          className="mx-auto w-full max-w-6xl px-md py-lg pb-32 lg:px-lg lg:pb-lg"
        >
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
            <AppNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              testId={item.href.startsWith("/admin") ? "admin-entry-link" : undefined}
              variant="mobile"
            />
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

      {section === "admin" ? (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 grid border-t border-outline-variant bg-surface-container-lowest px-xs lg:hidden"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => (
            <AppNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              testId="admin-entry-link"
              variant="mobile"
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
