import { prisma } from "@/lib/db";

type CurrentUser = {
  id: string;
  globalRole: "super_admin" | null;
  activeProjectId: string | null;
};

export async function getVisibleProjectsForUser(user: CurrentUser) {
  if (user.globalRole === "super_admin") {
    return prisma.project.findMany({
      where: { status: { not: "archived" } },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      include: {
        members: {
          where: { status: "active" },
          select: { role: true, userId: true },
        },
        storybook: {
          select: { status: true, approvedAt: true },
        },
        _count: {
          select: { days: true, schedules: true, uploads: true },
        },
      },
    });
  }

  return prisma.project.findMany({
    where: {
      status: { not: "archived" },
      members: {
        some: {
          userId: user.id,
          status: "active",
        },
      },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    include: {
      members: {
        where: { userId: user.id, status: "active" },
        select: { role: true, userId: true },
      },
      storybook: {
        select: { status: true, approvedAt: true },
      },
      _count: {
        select: { days: true, schedules: true, uploads: true },
      },
    },
  });
}

export async function canViewProject(user: CurrentUser, projectId: string) {
  if (user.globalRole === "super_admin") {
    const project = await prisma.project.findFirst({
      where: { id: projectId, status: { not: "archived" } },
      select: { id: true },
    });

    return Boolean(project);
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: user.id,
      status: "active",
    },
    select: { id: true },
  });

  return Boolean(membership);
}

export async function getActiveProjectSummary(user: CurrentUser) {
  if (!user.activeProjectId) {
    return null;
  }

  const canView = await canViewProject(user, user.activeProjectId);

  if (!canView) {
    return null;
  }

  return prisma.project.findUnique({
    where: { id: user.activeProjectId },
    select: {
      id: true,
      name: true,
      orgName: true,
      startDate: true,
      endDate: true,
    },
  });
}

