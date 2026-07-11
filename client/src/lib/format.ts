export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function dateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return ''; // 순번형 프로젝트 등 날짜 없음
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  active: '진행 중',
  completed: '완료',
  archived: '보관',
};

export const VIDEO_STATUS_LABEL: Record<string, string> = {
  uploaded: '업로드됨',
  published: '공개',
  hidden: '숨김',
};
