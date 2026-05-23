"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type LoginResponse = {
  error?: string;
  user?: {
    status: "pending" | "active" | "rejected" | "inactive";
  };
};

type LoginUserStatus = NonNullable<LoginResponse["user"]>["status"];

function destinationForStatus(status?: LoginUserStatus) {
  if (status === "pending") return "/pending";
  if (status === "rejected") return "/rejected";
  if (status === "inactive") return "/inactive";
  return "/";
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    const data = (await response.json()) as LoginResponse;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "로그인에 실패했습니다.");
      return;
    }

    router.push(destinationForStatus(data.user?.status));
    router.refresh();
  }

  return (
    <form className="space-y-md" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-secondary text-on-surface">이메일</span>
        <input
          className="mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md text-body focus:border-primary focus:outline-none"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      <label className="block">
        <span className="text-secondary text-on-surface">비밀번호</span>
        <input
          className="mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md text-body focus:border-primary focus:outline-none"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? (
        <p className="rounded border border-error-container bg-error-container p-sm text-secondary text-on-error-container">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}
