export type GlobalRole = "super_admin";
export type ProjectMemberRole = "project_manager" | "uploader";

export type ViewerContext = {
  userId: string;
  globalRole: GlobalRole | null;
  projectRole?: ProjectMemberRole | null;
};

export function isSuperAdmin(viewer: Pick<ViewerContext, "globalRole">) {
  return viewer.globalRole === "super_admin";
}

export function canManageProject(viewer: ViewerContext) {
  return isSuperAdmin(viewer) || viewer.projectRole === "project_manager";
}

export function canUploadToProject(viewer: ViewerContext) {
  return (
    isSuperAdmin(viewer) ||
    viewer.projectRole === "project_manager" ||
    viewer.projectRole === "uploader"
  );
}

export function canRunTextAi(viewer: ViewerContext) {
  return isSuperAdmin(viewer) || viewer.projectRole === "project_manager";
}

export function canUseSuperAdminMediaTools(viewer: ViewerContext) {
  return isSuperAdmin(viewer);
}
