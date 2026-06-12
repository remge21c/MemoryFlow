import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ProjectDTO } from '@memoryflow/shared';
import { apiGet } from '../lib/api';
import { AppShell } from '../components/AppShell';
import { Card, EmptyState, Icon, Pill, ProjectCardSkeleton } from '../components/ui';
import { dateRange, PROJECT_STATUS_LABEL } from '../lib/format';
import { useActiveProject } from '../stores/activeProject';

const STATUS_TONE: Record<string, 'primary' | 'success' | 'muted'> = {
  active: 'primary',
  completed: 'success',
  archived: 'muted',
};

export default function UploaderProjects() {
  const active = useActiveProject((s) => s.active);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiGet<{ projects: ProjectDTO[] }>('/projects'),
  });

  return (
    <AppShell>
      <h1 className="text-headline-md font-bold text-on-surface mb-6">내 프로젝트</h1>
      {isLoading ? (
        <div aria-label="프로젝트 목록 로딩 중" className="space-y-3">
          {[0, 1, 2].map((i) => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : !data?.projects.length ? (
        <EmptyState icon="folder_open" title="합류한 프로젝트가 없어요" hint="관리자가 보낸 초대 링크로 합류해보세요." />
      ) : (
        <div className="space-y-3">
          {data.projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name="photo_library" className="text-primary text-[24px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-title-sm font-semibold text-on-surface truncate">{p.name}</h2>
                    <Pill tone={STATUS_TONE[p.status] ?? 'muted'}>{PROJECT_STATUS_LABEL[p.status]}</Pill>
                    {active?.id === p.id ? <Pill tone="primary">활성</Pill> : null}
                  </div>
                  <p className="text-body-md text-on-surface-variant truncate">{p.org_name}</p>
                  <p className="text-label-sm text-outline mt-0.5">{dateRange(p.start_date, p.end_date)} · {p.day_count}일</p>
                </div>
                <Icon name="chevron_right" className="text-outline" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
