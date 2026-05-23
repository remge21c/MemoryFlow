import { StatusScreen } from "@/components/auth/status-screen";

export default function InactivePage() {
  return (
    <StatusScreen
      title="비활성화된 계정입니다"
      description="현재 계정은 사용할 수 없습니다. 슈퍼 어드민에게 문의해 주세요."
    />
  );
}
