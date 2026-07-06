import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { AppShell } from '../components/AppShell';
import { Card, EmptyState, Icon, Pill, Skeleton } from '../components/ui';
import { useActiveProject } from '../stores/activeProject';
import { useBgm } from '../hooks/useBgm';
import type { FeedData, FeedSchedule } from '../lib/feed';

const MAX = 'max-w-2xl lg:max-w-3xl';

export default function ProjectHome() {
  const { pid } = useParams();
  const setViewing = useActiveProject((s) => s.setViewing);

  const { data, isLoading } = useQuery({
    queryKey: ['feed', pid],
    queryFn: () => apiGet<FeedData>(`/projects/${pid}/feed`),
  });

  useEffect(() => {
    if (data) setViewing({ id: data.project.id, name: data.project.name, org_name: data.project.org_name ?? undefined });
  }, [data, setViewing]);

  const bgm = useBgm(data?.project.bgm_url ?? null);

  if (isLoading) return <AppShell max={MAX}><HomeSkeleton /></AppShell>;
  if (!data) return <AppShell max={MAX}><EmptyState icon="error" title="프로젝트를 찾을 수 없습니다" /></AppShell>;

  const { project, days } = data;
  const allSchedules = days.flatMap((d) => d.schedules);
  const total = allSchedules.length;
  const recordedCount = allSchedules.filter((s) => s.contributions.length > 0).length;
  const pct = total > 0 ? Math.round((recordedCount / total) * 100) : 0;
  const hasCover = !!project.cover_url;

  return (
    <AppShell max={MAX}>
      {/* 히어로 — 프로젝트명 + 커버 배경 + BGM */}
      <div className="relative rounded-2xl overflow-hidden mb-5">
        {hasCover ? (
          <img src={project.cover_url!} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        <div
          className={`relative min-h-[190px] flex flex-col justify-end p-5 ${
            hasCover ? 'bg-gradient-to-t from-black/75 via-black/30 to-black/10' : 'bg-tertiary-container'
          }`}
        >
          {project.org_name ? (
            <p className={`text-label-sm ${hasCover ? 'text-white/80' : 'text-on-tertiary-container/80'}`}>{project.org_name}</p>
          ) : null}
          <h1 className={`text-headline-md font-bold leading-tight ${hasCover ? 'text-white' : 'text-on-tertiary-container'}`}>
            {project.name}
          </h1>

          {bgm.available ? (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={bgm.toggle}
                aria-label={bgm.playing ? '배경음악 정지' : '배경음악 재생'}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center hover:bg-white/30 transition-colors shrink-0"
              >
                <Icon name={bgm.playing ? 'pause' : 'play_arrow'} fill className="text-[24px]" />
              </button>
              <Icon name="music_note" className="text-white/80 text-[18px] shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={bgm.volume}
                onChange={(e) => bgm.setVolume(Number(e.target.value))}
                aria-label="배경음악 볼륨"
                className="w-28 accent-white"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* 진행률 */}
      {total > 0 ? (
        <div className="mb-6">
          <div className="flex justify-between text-label-sm text-on-surface-variant mb-1.5">
            <span className="font-medium">기록 진행</span>
            <span>{recordedCount} / {total} 일정</span>
          </div>
          <div className="h-2 rounded-full bg-surface-container overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}

      {/* 일정별 진행 목록 */}
      {total === 0 ? (
        <EmptyState icon="event_busy" title="아직 일정이 없어요" hint="관리자가 일정을 만들면 여기에 표시됩니다." />
      ) : (
        days.map((day) =>
          day.schedules.length === 0 ? null : (
            <section key={day.day_index} className="mb-6">
              <div className="flex items-center justify-center my-3">
                <span className="bg-secondary-container text-on-secondary-container text-body-md font-semibold px-4 py-1.5 rounded-full">
                  {day.date ? `Day ${day.day_index} · ${day.date}` : `#${day.day_index}`}
                </span>
              </div>
              <div className="space-y-2">
                {day.schedules.map((s) => (
                  <ScheduleProgressRow key={s.id} pid={pid!} s={s} />
                ))}
              </div>
            </section>
          ),
        )
      )}
    </AppShell>
  );
}

function ScheduleProgressRow({ pid, s }: { pid: string; s: FeedSchedule }) {
  const recordN = s.contributions.length;
  const recorded = recordN > 0;
  const photos = s.contributions.reduce((a, c) => a + c.media.filter((m) => m.type === 'photo').length, 0);
  const videos = s.contributions.reduce((a, c) => a + c.media.filter((m) => m.type === 'video').length, 0);
  const counts = [
    `기록 ${recordN}`,
    photos ? `사진 ${photos}` : null,
    videos ? `영상 ${videos}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link to={`/projects/${pid}/schedules/${s.id}`}>
      <Card className="p-3.5 flex items-center gap-3 hover:border-primary/30 hover:bg-surface-low transition-colors">
        <Icon name={recorded ? 'check_circle' : 'radio_button_unchecked'} fill={recorded} className={`text-[22px] shrink-0 ${recorded ? 'text-tertiary' : 'text-outline/50'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {s.time ? <span className="text-label-sm text-on-surface-variant shrink-0">{s.time}</span> : null}
            <span className="text-body-lg font-semibold text-on-surface truncate">{s.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {recorded ? <Pill tone="success">기록됨</Pill> : <Pill tone="muted">미기록</Pill>}
            {recorded ? <span className="text-label-sm text-outline truncate">{counts}</span> : null}
          </div>
        </div>
        <Icon name="chevron_right" className="text-outline shrink-0" />
      </Card>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="w-full h-[190px] rounded-2xl mb-5" />
      <Skeleton className="h-2 w-full rounded-full mb-6" />
      <div className="flex items-center justify-center my-3"><Skeleton className="h-8 w-40 rounded-full" /></div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    </div>
  );
}
