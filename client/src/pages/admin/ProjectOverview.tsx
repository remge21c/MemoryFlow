import { useOutletContext, useParams, Link } from 'react-router-dom';
import type { ProjectDetail } from './ProjectLayout';
import { Card, Icon, Pill } from '../../components/ui';
import { dateRange, PROJECT_STATUS_LABEL } from '../../lib/format';

export default function ProjectOverview() {
  const data = useOutletContext<ProjectDetail>();
  const { pid } = useParams();
  const p = data.project;
  const scheduleCount = data.days.reduce((a, d) => a + d.schedules.length, 0);

  const steps = [
    { to: 'schedules', icon: 'event', label: '일정(장면) 설계', desc: `${scheduleCount}개 장면 · ${p.day_count}일` },
    { to: 'invites', icon: 'link', label: '초대 링크', desc: '업로더 초대' },
    { to: 'members', icon: 'group', label: '멤버 관리', desc: '합류한 사람들' },
    { to: 'storybook', icon: 'auto_stories', label: '스토리북 편집', desc: '사진 선별·내레이션·승인' },
    { to: 'share', icon: 'share', label: '공유 링크', desc: '외부 열람 발급' },
    { to: 'videos', icon: 'movie', label: '영상·내보내기', desc: '패키지/최종 영상' },
  ];

  return (
    <div>
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Pill tone="muted">{PROJECT_STATUS_LABEL[p.status]}</Pill>
          <Pill tone="muted">기본 노출 {p.default_photo_seconds}초</Pill>
          {data.storybook.status === 'approved' ? <Pill tone="success">승인됨</Pill> : <Pill tone="primary">편집 중</Pill>}
        </div>
        <p className="text-body-md text-on-surface-variant">{dateRange(p.start_date, p.end_date)}</p>
        {p.description ? <p className="text-body-md text-on-surface mt-2 whitespace-pre-line">{p.description}</p> : null}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {steps.map((s) => (
          <Link key={s.to} to={s.to}>
            <Card className="p-4 h-full">
              <Icon name={s.icon} className="text-primary text-[26px] mb-2" />
              <p className="text-body-lg font-semibold text-on-surface">{s.label}</p>
              <p className="text-label-sm text-outline mt-0.5">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
