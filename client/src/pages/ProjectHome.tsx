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
      {/* 히어로 — 프로젝트 이미지를 최대한 살리고, 프로젝트명은 이미지 위에 오버레이 */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        {hasCover ? (
          <>
            <img src={project.cover_url!} alt="" className="block w-full aspect-[16/10] object-cover" />
            {/* 이름 가독용 하단 그라데이션만 — 이미지 상단은 깨끗하게 노출 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              {project.org_name ? <p className="text-label-sm text-white/85 drop-shadow-sm">{project.org_name}</p> : null}
              <h1 className="text-headline-md font-bold text-white leading-tight drop-shadow-sm">{project.name}</h1>
            </div>
          </>
        ) : (
          <div className="relative bg-tertiary-container p-5 min-h-[128px] flex flex-col justify-end">
            {project.org_name ? <p className="text-label-sm text-on-tertiary-container/80">{project.org_name}</p> : null}
            <h1 className="text-headline-md font-bold text-on-tertiary-container leading-tight">{project.name}</h1>
          </div>
        )}
        {/* BGM — 재생/정지 버튼 하나만 (볼륨은 기기에서 조절). 우상단 플로팅. */}
        {project.bgm_url ? <BgmPlayer url={project.bgm_url} className="absolute top-3 right-3" /> : null}
      </div>

      {/* 진행 요약 — 원형 링 + 남은 개수 */}
      {total > 0 ? (
        <Card className="p-4 mb-6 flex items-center gap-4">
          <ProgressRing pct={pct} />
          <div className="min-w-0">
            <p className="text-title-sm font-bold text-on-surface">
              {pct === 100 ? '기록 완료 🎉' : recordedCount === 0 ? '기록을 시작해요' : '기록 진행 중'}
            </p>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              <span className="text-tertiary font-semibold">{recordedCount}개 완료</span>
              {total - recordedCount > 0 ? <span> · {total - recordedCount}개 남음</span> : null}
            </p>
            <div className="mt-2 h-1.5 w-40 max-w-full rounded-full bg-surface-container overflow-hidden">
              <div className="h-full bg-tertiary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </Card>
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
              <div>
                {day.schedules.map((s, idx) => (
                  <TimelineItem key={s.id} pid={pid!} s={s} isLast={idx === day.schedules.length - 1} />
                ))}
              </div>
            </section>
          ),
        )
      )}
    </AppShell>
  );
}

/** BGM — 재생/정지 버튼 하나. 볼륨은 기기에서 조절. 히어로 이미지 위에 플로팅. */
function BgmPlayer({ url, className = '' }: { url: string; className?: string }) {
  const bgm = useBgm(url);
  return (
    <button
      onClick={bgm.toggle}
      aria-label={bgm.playing ? '배경음악 정지' : '배경음악 재생'}
      title={bgm.error ?? (bgm.playing ? '정지' : '배경음악 재생')}
      className={`w-11 h-11 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-black/55 transition-colors shadow-md ${
        bgm.error ? 'ring-2 ring-error' : ''
      } ${className}`}
    >
      <Icon name={bgm.playing ? 'pause' : 'play_arrow'} fill className="text-[26px]" />
    </button>
  );
}

/** 원형 진행 링 — 가운데 퍼센트. */
function ProgressRing({ pct }: { pct: number }) {
  const r = 26;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-surface-container" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          className="stroke-tertiary transition-all duration-700"
          style={{ strokeDasharray: C, strokeDashoffset: C * (1 - pct / 100) }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-title-sm font-bold text-tertiary">{pct}%</span>
    </div>
  );
}

/** 타임라인 항목 — 좌측 진행 레일(노드+연결선) + 기록 카드(상태·카운트·썸네일). */
function TimelineItem({ pid, s, isLast }: { pid: string; s: FeedSchedule; isLast: boolean }) {
  const recordN = s.contributions.length;
  const recorded = recordN > 0;
  const media = s.contributions.flatMap((c) => c.media);
  const photos = media.filter((m) => m.type === 'photo').length;
  const videos = media.filter((m) => m.type === 'video').length;
  const thumbs = media.slice(0, 5);
  const counts = [`기록 ${recordN}`, photos ? `사진 ${photos}` : null, videos ? `영상 ${videos}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex gap-3">
      {/* 진행 레일 */}
      <div className="flex flex-col items-center pt-1">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-4 transition-colors ${
            recorded
              ? 'bg-tertiary text-on-tertiary ring-tertiary/15'
              : 'bg-surface-lowest text-outline/50 ring-outline/10 border border-outline/25'
          }`}
        >
          <Icon name={recorded ? 'check' : 'more_horiz'} className="text-[16px]" />
        </div>
        {!isLast ? <div className={`w-0.5 flex-1 my-1 rounded ${recorded ? 'bg-tertiary/35' : 'bg-outline/15'}`} /> : null}
      </div>

      {/* 기록 카드 — 보기 피드(세부일정)의 해당 일정으로 이동 */}
      <Link to={`/projects/${pid}/records#s-${s.id}`} className="flex-1 min-w-0 pb-3">
        <Card className={`p-3.5 transition-colors hover:border-primary/40 hover:bg-surface-low ${recorded ? '' : 'bg-surface/60'}`}>
          <div className="flex items-center gap-2">
            {s.time ? <span className="text-label-sm text-on-surface-variant shrink-0">{s.time}</span> : null}
            <span className={`text-body-lg font-semibold truncate flex-1 ${recorded ? 'text-on-surface' : 'text-on-surface-variant'}`}>{s.title}</span>
            <Icon name="chevron_right" className="text-outline shrink-0" />
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {recorded ? <Pill tone="success">기록됨</Pill> : <Pill tone="muted">미기록</Pill>}
            <span className="text-label-sm text-outline truncate">{recorded ? counts : '눌러서 기록 시작'}</span>
          </div>

          {thumbs.length ? (
            <div className="flex gap-1.5 mt-2.5">
              {thumbs.map((m) => (
                <div key={m.id} className="relative w-12 h-12 rounded-md overflow-hidden bg-surface-container shrink-0">
                  <img src={m.thumb_url ?? m.url} loading="lazy" className="w-full h-full object-cover" alt="" />
                  {m.type === 'video' ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Icon name="play_arrow" fill className="text-white text-[16px]" />
                    </span>
                  ) : null}
                </div>
              ))}
              {media.length > thumbs.length ? (
                <div className="w-12 h-12 rounded-md bg-surface-container flex items-center justify-center text-label-sm font-medium text-on-surface-variant shrink-0">
                  +{media.length - thumbs.length}
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </Link>
    </div>
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
