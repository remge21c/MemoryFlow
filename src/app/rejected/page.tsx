import { StatusScreen } from "@/components/auth/status-screen";

export default function RejectedPage() {
  return (
    <StatusScreen
      title="가입 요청이 승인되지 않았습니다"
      description="필요하다면 프로젝트 담당자나 슈퍼 어드민에게 다시 확인해 주세요."
    />
  );
}
