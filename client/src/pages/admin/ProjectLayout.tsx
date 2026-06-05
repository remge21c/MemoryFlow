import { useEffect } from 'react';
import { NavLink, Outlet, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ProjectDTO, ScheduleDTO, StorybookDTO } from '@memoryflow/shared';
import { apiGet } from '../../lib/api';
import { AppShell, TopBar } from '../../components/AppShell';
import { Icon, Spinner } from '../../components/ui';
import { useActiveProject } from '../../stores/activeProject';

export interface ProjectDetail {
  project: ProjectDTO;
  days: { day_index: number; date: string; schedules: ScheduleDTO[] }[];
  storybook: StorybookDTO;
}

const TABS = [
  { to: '', label: '개요', icon: 'dashboard', end: true },
  { to: 'schedules', label: '일정(장면)', icon: 'event' },
  { to: 'storybook', label: '스토리북 편집', icon: 'auto_stories' },
  { to: 'invites', label: '초대 링크', icon: 'link' },
  { to: 'members', label: '멤버', icon: 'group' },
  { to: 'share', label: '공유 링크', icon: 'share' },
  { to: 'videos', label: '영상·내보내기', icon: 'movie' },
];

export function useProjectDetail(pid: string | undefined) {
  return useQuery({
    queryKey: ['project', pid],
    queryFn: () => apiGet<ProjectDetail>(`/projects/${pid}`),
    enabled: !!pid,
  });
}

export default function ProjectLayout() {
  const { pid } = useParams();
  const { data, isLoading } = useProjectDetail(pid);
  const setActive = useActiveProject((s) => s.setActive);
  const loc = useLocation();
  const navigate = useNavigate();

  // 현재 활성 서브경로 판별 (예: "", "schedules", "storybook" 등)
  const currentSubPath = loc.pathname.split(`/admin/projects/${pid}`)[1]?.replace(/^\//, '') || '';

  useEffect(() => {
    if (data) setActive({ id: data.project.id, name: data.project.name, org_name: data.project.org_name ?? undefined });
  }, [data, setActive]);

  return (
    <AppShell>
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          <TopBar title={data.project.name} subtitle={data.project.org_name ?? ''} />

          {/* 모바일: 드롭다운 네비게이션 (제안 1) */}
          <div className="md:hidden block mb-6 relative">
            <select
              value={currentSubPath}
              onChange={(e) => navigate(`/admin/projects/${pid}/${e.target.value}`)}
              className="w-full h-12 pl-10 pr-10 text-body-md font-medium text-on-surface bg-surface-container border border-outline/20 rounded-xl appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {TABS.map((t) => (
                <option key={t.to} value={t.to}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="absolute left-3 top-3.5 pointer-events-none">
              <Icon name={TABS.find((t) => t.to === currentSubPath)?.icon || 'dashboard'} className="text-[20px] text-primary" />
            </div>
            <div className="absolute right-3 top-3.5 pointer-events-none">
              <Icon name="keyboard_arrow_down" className="text-[20px] text-on-surface-variant" />
            </div>
          </div>

          {/* 데스크톱: 수평 스크롤 탭 네비게이션 */}
          <nav aria-label="프로젝트 섹션" className="md:flex hidden overflow-x-auto no-scrollbar border-b border-outline/15 -mx-5 px-5 mb-6">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-3 text-body-md font-medium whitespace-nowrap border-b-2 -mb-px transition-colors shrink-0 focus-visible:outline-none focus-visible:bg-surface-container rounded-t ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline/30'
                  }`
                }
              >
                <Icon name={t.icon} className="text-[18px]" />
                <span>{t.label}</span>
              </NavLink>
            ))}
          </nav>

          <Outlet context={data} />
        </>
      )}
    </AppShell>
  );
}
