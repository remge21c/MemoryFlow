import { AuthCard } from "@/components/auth/auth-card";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

export async function StatusScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <AuthCard title={title} description={description}>
      <LogoutButton />
    </AuthCard>
  );
}
