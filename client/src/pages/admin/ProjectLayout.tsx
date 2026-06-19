import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ProjectDTO, ScheduleDTO, StorybookDTO } from '@memoryflow/shared';
import { apiGet } from '../../lib/api';
import { AppShell, TopBar } from '../../components/AppShell';
import { Spinner } from '../../components/ui';
import { useActiveProject } from '../../stores/activeProject';

export interface ProjectDetail {
  project: ProjectDTO;
  days: { day_index: number; date: string | null; schedules: ScheduleDTO[] }[];
  storybook: StorybookDTO;
}

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
  const setViewing = useActiveProject((s) => s.setViewing);

  // 보고 있는 프로젝트 표시(타이틀 바)만 갱신 — 활성화는 설정 페이지에서만
  useEffect(() => {
    if (data) setViewing({ id: data.project.id, name: data.project.name, org_name: data.project.org_name ?? undefined });
  }, [data, setViewing]);

  return (
    <AppShell max="max-w-2xl lg:max-w-5xl">
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <>
          {/* 데스크톱은 상단 고정 타이틀 바가 프로젝트명을 표시 — 모바일에서만 노출 */}
          <div className="lg:hidden">
            <TopBar title={data.project.name} subtitle={data.project.org_name ?? ''} />
          </div>

          {/* 섹션 이동: 데스크톱은 사이드바, 모바일은 햄버거 메뉴에서 */}
          <Outlet context={data} />
        </>
      )}
    </AppShell>
  );
}
