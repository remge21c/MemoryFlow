"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type SignupResponse = {
  error?: string;
};

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });
    const data = (await response.json()) as SignupResponse;

    setIsSubmitting(false);

    if (!response.ok) {
      setError(data.error ?? "회원가입에 실패했습니다.");
      return;
    }

    router.push("/pending");
    router.refresh();
  }

  return (
    <form className="space-y-md" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-secondary text-on-surface">이름</span>
        <input
          className="mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md text-body focus:border-primary focus:outline-none"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
        />
      </label>
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
          autoComplete="new-password"
          required
          minLength={10}
        />
      </label>
      {error ? (
        <p className="rounded border border-error-container bg-error-container p-sm text-secondary text-on-error-container">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "가입 요청 중..." : "가입 요청"}
      </Button>
    </form>
  );
}
