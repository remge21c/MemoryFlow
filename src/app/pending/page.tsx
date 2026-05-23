import { StatusScreen } from "@/components/auth/status-screen";

export default function PendingPage() {
  return (
    <StatusScreen
      title="승인 대기 중"
      description="가입 요청이 접수되었습니다. 슈퍼 어드민이 승인하고 프로젝트를 배정하면 사용할 수 있습니다."
    />
  );
}
