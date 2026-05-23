import { prisma } from "@/lib/db";
import { getSessionClaims } from "@/lib/auth/session";

export async function getCurrentUser() {
  const claims = await getSessionClaims();

  if (!claims) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      globalRole: true,
      activeProjectId: true,
    },
  });
}
