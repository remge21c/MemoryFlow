import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MediaDTO } from '@memoryflow/shared';
import { apiGet, apiPatch } from '../lib/api';
import { AppShell } from '../components/AppShell';
import { EmptyState, Icon, Skeleton } from '../components/ui';
import { MediaLightbox } from '../components/MediaLightbox';
import { MediaCarousel } from '../components/MediaCarousel';
import { useActiveProject } from '../stores/activeProject';
import { useMe } from '../lib/auth';
import type { FeedContribution, FeedData, FeedSchedule } from '../lib/feed';

/** 라이트박스 열기 정보 — 뷰어 전용. 편집은 editHref(기록 페이지의 해당 기록)로 이동. */
interface LightboxState {
  items: MediaDTO[];
  start: number;
  story?: string;
  /** 내 기록이면 기록 페이지의 그 기록 경로(#앵커 포함) — "수정" 버튼으로 이동 */
  editHref?: string;
}

export default function ScheduleList() {
  const { pid } = useParams();
  const setViewing = useActiveProject((s) => s.setViewing);
  const { data: meData } = useMe();
  const isAdmin = meData?.user?.is_admin ?? false;
  const [lb, setLb] = useState<LightboxState | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['feed', pid],
    queryFn: () => apiGet<FeedData>(`/projects/${pid}/feed`),
  });

  // 보고 있는 프로젝트 표시(타이틀 바)만 갱신 — 활성화는 설정 페이지에서만
  useEffect(() => {
    if (data) setViewing({ id: data.project.id, name: data.project.name, org_name: data.project.org_name ?? undefined });
  }, [data, setViewing]);

  if (isLoading) return <AppShell max="max-w-2xl lg:max-w-3xl"><FeedSkeleton /></AppShell>;
  if (!data) return <AppShell><EmptyState icon="error" title="프로젝트를 찾을 수 없습니다" /></AppShell>;

  const hasAnySchedule = data.days.some((d) => d.schedules.length > 0);

  return (
    <AppShell max="max-w-2xl lg:max-w-3xl">
      {/* 헤더 — 데스크톱은 상단 고정 타이틀 바가 대신함 */}
      <div className="mb-5 min-w-0 lg:hidden flex items-baseline gap-2">
        <h1 className="text-headline-md font-bold text-on-surface truncate">{data.project.name}</h1>
        {data.project.org_name ? <p className="text-body-md text-on-surface-variant truncate shrink-0">{data.project.org_name}</p> : null}
      </div>

      {!hasAnySchedule ? (
        <EmptyState icon="event_busy" title="아직 일정이 없어요" hint="관리자가 일정을 만들면 여기에 표시됩니다." />
      ) : (
        data.days.map((day) =>
          day.schedules.length === 0 ? null : (
            <section key={day.day_index} className="mb-8">
              {/* 카톡 날짜 구분선 */}
              <div className="flex items-center justify-center my-4">
                <span className="bg-secondary-container text-on-secondary-container text-body-md font-semibold px-4 py-1.5 rounded-full">
                  {day.date ? `Day ${day.day_index} · ${day.date}` : `#${day.day_index}`}
                </span>
              </div>

              {day.schedules.map((s) => (
                <SceneBlock key={s.id} pid={pid!} schedule={s} onOpen={setLb} isAdmin={isAdmin} />
              ))}
            </section>
          ),
        )
      )}

      {lb ? (
        <MediaLightbox
          items={lb.items}
          start={lb.start}
          story={lb.story}
          editHref={lb.editHref}
          onClose={() => setLb(null)}
        />
      ) : null}
    </AppShell>
  );
}

/** 피드 로딩 스켈레톤 — 실제 레이아웃(날짜 구분선 + 장면 블록)과 같은 구조라 로드 완료 시 튐이 없다. */
function FeedSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex items-center justify-center my-4">
        <Skeleton className="h-8 w-44 rounded-full" />
      </div>
      {[0, 1].map((s) => (
        <div key={s} className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="w-full aspect-[4/3] rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function SceneBlock({
  pid,
  schedule,
  onOpen,
  isAdmin,
}: {
  pid: string;
  schedule: FeedSchedule;
  onOpen: (lb: LightboxState) => void;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal, setTitleVal] = useState(schedule.title);

  if (!titleEdit && titleVal !== schedule.title) setTitleVal(schedule.title);

  const saveTitleMut = useMutation({
    mutationFn: (title: string) => apiPatch(`/schedules/${schedule.id}`, { title }),
    onSuccess: () => { setTitleEdit(false); qc.invalidateQueries({ queryKey: ['feed', pid] }); },
  });

  function commitTitle() {
    const t = titleVal.trim();
    if (!t || t === schedule.title) { setTitleEdit(false); return; }
    saveTitleMut.mutate(t);
  }

  return (
    <div className="mb-6">
      {/* 세부일정 헤더 */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
          {schedule.time ? <span className="text-label-sm text-on-surface-variant shrink-0">{schedule.time}</span> : null}
          {isAdmin && titleEdit ? (
            <input
              autoFocus
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') { setTitleEdit(false); setTitleVal(schedule.title); }
              }}
              className="flex-1 rounded border border-primary/50 bg-surface-lowest px-2 py-0.5 text-title-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          ) : (
            <h2
              className={`text-title-sm font-semibold text-on-surface truncate ${isAdmin ? 'cursor-text hover:text-primary' : ''}`}
              onClick={() => isAdmin && setTitleEdit(true)}
              title={isAdmin ? '클릭하여 제목 편집' : undefined}
            >
              {schedule.title}
            </h2>
          )}
        </div>
        <Link
          to={`/projects/${pid}/schedules/${schedule.id}`}
          className="shrink-0 flex items-center gap-1 text-label-sm font-semibold text-primary"
        >
          <Icon name="add_a_photo" className="text-[18px]" /> 기록
        </Link>
      </div>

      {schedule.contributions.length === 0 ? (
        <Link to={`/projects/${pid}/schedules/${schedule.id}`}>
          <div className="rounded-lg border border-dashed border-outline/25 px-4 py-5 text-center text-body-md text-outline hover:border-primary/40">
            아직 기록이 없어요 · 눌러서 사진·글 올리기
          </div>
        </Link>
      ) : (
        <div className="space-y-3">
          {schedule.contributions.map((c) => (
            <Bubble key={c.id} c={c} pid={pid} scheduleId={schedule.id} onOpen={onOpen} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}

function Bubble({
  c,
  pid,
  scheduleId,
  onOpen,
  isAdmin,
}: {
  c: FeedContribution;
  pid: string;
  scheduleId: number;
  onOpen: (lb: LightboxState) => void;
  isAdmin: boolean;
}) {
  const mine = c.is_mine;
  const canEdit = mine || isAdmin;
  // 기록 페이지의 이 기록 위치로 이동 (#앵커로 스크롤)
  const editHref = canEdit ? `/projects/${pid}/schedules/${scheduleId}#c-${c.id}` : undefined;

  return (
    <div className="relative">
      {/* 사진/영상: 전체 폭 */}
      {c.media.length > 0 ? (
        <>
          {!mine ? <p className="text-label-sm text-on-surface-variant mb-1">{c.uploader_name}</p> : null}
          <MediaCarousel
            media={c.media}
            fit="contain"
            onItemClick={(start) =>
              onOpen({
                items: c.media,
                start,
                story: c.story_text || undefined,
                editHref,
              })
            }
          />
        </>
      ) : null}

      {/* 스토리 텍스트: 전체 폭 카드 */}
      {c.story_text ? (
        <div className="mt-1.5 rounded-xl border border-outline/10 bg-surface-lowest linen-shadow px-3.5 py-2.5">
          {!mine && c.media.length === 0 ? <p className="text-label-sm text-primary font-semibold mb-1">{c.uploader_name}</p> : null}
          <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-line">{c.story_text}</p>
        </div>
      ) : null}

    </div>
  );
}
