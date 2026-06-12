// 관리자 프로젝트 섹션 메뉴 — 데스크톱 사이드바(AppShell)와 모바일 드롭다운(ProjectLayout)이 공유.
export interface AdminTab {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

export const ADMIN_PROJECT_TABS: AdminTab[] = [
  { to: '', label: '개요', icon: 'dashboard', end: true },
  { to: 'schedules', label: '일정(장면)', icon: 'event' },
  { to: 'storybook', label: '스토리북 편집', icon: 'auto_stories' },
  { to: 'invites', label: '초대 링크', icon: 'link' },
  { to: 'members', label: '멤버', icon: 'group' },
  { to: 'share', label: '공유 링크', icon: 'share' },
  { to: 'videos', label: '영상·내보내기', icon: 'movie' },
];
