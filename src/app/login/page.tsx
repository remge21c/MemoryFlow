import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/current-user";

function destinationForStatus(status: string) {
  if (status === "pending") return "/pending";
  if (status === "rejected") return "/rejected";
  if (status === "inactive") return "/inactive";
  return "/";
}

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(destinationForStatus(user.status));
  }

  return (
    <AuthCard
      title="로그인"
      description="승인된 계정으로 프로젝트 기록을 이어갑니다."
      footer={
        <p>
          아직 계정이 없나요?{" "}
          <Link href="/signup" className="font-medium text-primary">
            회원가입
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
