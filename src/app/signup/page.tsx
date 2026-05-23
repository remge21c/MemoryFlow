import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <AuthCard
      title="회원가입"
      description="가입 요청 후 슈퍼 어드민이 승인하면 프로젝트에 참여할 수 있습니다."
      footer={
        <p>
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-medium text-primary">
            로그인
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
