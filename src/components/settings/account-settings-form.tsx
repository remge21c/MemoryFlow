"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AccountSettingsFormProps = {
  user: {
    email: string;
    name: string;
    globalRole: "super_admin" | null;
  };
};

const inputClass =
  "mt-xs h-tap-target w-full rounded border border-outline-variant bg-surface-container-lowest px-md text-body focus:border-primary focus:outline-none";

async function patchJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "요청 처리에 실패했습니다.");
  }

  return data;
}

export function AccountSettingsForm({ user }: AccountSettingsFormProps) {
  const router = useRouter();
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setProfileMessage(null);
    setIsSavingProfile(true);

    const formData = new FormData(event.currentTarget);

    try {
      await patchJson("/api/account/profile", {
        name: formData.get("name"),
        email: formData.get("email"),
      });
      setProfileMessage("계정 정보가 저장되었습니다.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "계정 정보 저장에 실패했습니다.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPasswordMessage(null);
    setIsSavingPassword(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await patchJson("/api/account/password", {
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
      });
      form.reset();
      setPasswordMessage("비밀번호가 변경되었습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="space-y-md">
      {error ? (
        <p className="rounded border border-error-container bg-error-container p-sm text-secondary text-on-error-container">
          {error}
        </p>
      ) : null}

      <Card>
        <form className="space-y-md" onSubmit={saveProfile}>
          <div>
            <p className="text-section-title text-on-surface">계정 정보</p>
            <p className="mt-xs text-secondary text-on-surface-variant">
              로그인 이름과 이메일을 변경합니다.
            </p>
          </div>

          <label className="block">
            <span className="text-secondary text-on-surface">이름</span>
            <input className={inputClass} name="name" defaultValue={user.name} required />
          </label>

          <label className="block">
            <span className="text-secondary text-on-surface">이메일</span>
            <input
              className={inputClass}
              name="email"
              type="email"
              defaultValue={user.email}
              required
            />
          </label>

          <div className="flex flex-wrap items-center gap-sm">
            <Button disabled={isSavingProfile}>
              {isSavingProfile ? "저장 중..." : "계정 정보 저장"}
            </Button>
            {profileMessage ? (
              <p className="text-secondary text-primary">{profileMessage}</p>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <form className="space-y-md" onSubmit={savePassword}>
          <div>
            <p className="text-section-title text-on-surface">비밀번호 변경</p>
            <p className="mt-xs text-secondary text-on-surface-variant">
              새 비밀번호는 10자 이상으로 설정합니다.
            </p>
          </div>

          <label className="block">
            <span className="text-secondary text-on-surface">현재 비밀번호</span>
            <input
              className={inputClass}
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <label className="block">
            <span className="text-secondary text-on-surface">새 비밀번호</span>
            <input
              className={inputClass}
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>

          <label className="block">
            <span className="text-secondary text-on-surface">새 비밀번호 확인</span>
            <input
              className={inputClass}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </label>

          <div className="flex flex-wrap items-center gap-sm">
            <Button disabled={isSavingPassword}>
              {isSavingPassword ? "변경 중..." : "비밀번호 변경"}
            </Button>
            {passwordMessage ? (
              <p className="text-secondary text-primary">{passwordMessage}</p>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
