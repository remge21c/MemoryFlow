"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutIconButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="focus-ring flex h-9 w-9 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
      aria-label="로그아웃"
      data-testid="logout-button"
      title="로그아웃"
      onClick={logout}
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
