import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ProjectDTO } from '@memoryflow/shared';
import { apiGet } from '../lib/api';
import { AppShell } from '../components/AppShell';
import { Button, Card, EmptyState, Icon, Pill, ProjectCardSkeleton } from '../components/ui';
import { dateRange, PROJECT_STATUS_LABEL } from '../lib/format';

export default function AdminProjects() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiGet<{ projects: ProjectDTO[] }>('/projects'),
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-headline-md font-bold text-on-surface">프로젝트</h1>
        <Button icon="add" className="h-10 px-5" onClick={() => nav('/admin/projects/new')}>
          새 프로젝트
        </Button>
      </div>
      {isLoading ? (
        <div aria-label="프로젝트 목록 로딩 중" className="space-y-3">
          {[0, 1, 2].map((i) => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : !data?.projects.length ? (
        <EmptyState icon="add_photo_alternate" title="첫 프로젝트를 만들어보세요" hint="여행·수련회·행사 단위로 기록을 모읍니다." />
      ) : (
        <div className="space-y-3">
          {data.projects.map((p) => (
            <Link key={p.id} to={`/admin/projects/${p.id}`}>
              <Card className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name="folder" className="text-primary text-[24px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-title-sm font-semibold truncate">{p.name}</h2>
                    <Pill tone="muted">{PROJECT_STATUS_LABEL[p.status]}</Pill>
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
