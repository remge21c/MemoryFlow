import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { MediaDTO, ScheduleDTO } from '@memoryflow/shared';
import { apiGet } from '../lib/api';
import { AppShell } from '../components/AppShell';
import { EmptyState, Icon, Spinner } from '../components/ui';
import { MediaLightbox } from '../components/MediaLightbox';
import { MediaCarousel } from '../components/MediaCarousel';
import { useActiveProject } from '../stores/activeProject';
import { useMe } from '../lib/auth';

interface FeedContribution {
  id: number;
  uploader_id: number;
  uploader_name: string;
  is_mine: boolean;
  story_text: string;
  created_at: string;
  media: MediaDTO[];
}
type FeedSchedule = ScheduleDTO & { contributions: FeedContribution[] };
interface FeedData {
  project: { id: number; name: string; org_name: string | null; start_date: string; end_date: string };
  days: { day_index: number; date: string; schedules: FeedSchedule[] }[];
}

/** 라이트박스 열기 정보 — 뷰어 전용. 수정은 editHref(기록 페이지)로 이동. */
interface LightboxState {
  items: MediaDTO[];
  start: number;
  story?: string;
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

  if (isLoading) return <AppShell><Spinner /></AppShell>;
  if (!data) return <AppShell><EmptyState icon="error" title="프로젝트를 찾을 수 없습니다" /></AppShell>;

  const hasAnySchedule = data.days.some((d) => d.schedules.length > 0);

  return (
    <AppShell max="max-w-2xl lg:max-w-3xl">
      {/* 헤더 — 데스크톱은 상단 고정 타이틀 바가 대신함 */}
      <div className="mb-5 min-w-0 lg:hidden">
        <h1 className="text-headline-md font-bold text-on-surface truncate">{data.project.name}</h1>
        {data.project.org_name ? <p className="text-body-md text-on-surface-variant truncate">{data.project.org_name}</p> : null}
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
                  Day {day.day_index} · {day.date}
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
  return (
    <div className="mb-6">
      {/* 세부일정 헤더 */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {schedule.time ? <span className="text-label-sm text-on-surface-variant">{schedule.time}</span> : null}
          <h2 className="text-title-sm font-semibold text-on-surface truncate">{schedule.title}</h2>
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
  const editHref = `/projects/${pid}/schedules/${scheduleId}`;

  return (
    <div className="relative">
      {/* 사진/영상: 전체 폭 */}
      {c.media.length > 0 ? (
        <>
          {!mine ? <p className="text-label-sm text-on-surface-variant mb-1">{c.uploader_name}</p> : null}
          <MediaCarousel
            media={c.media}
            onItemClick={(start) =>
              onOpen({
                items: c.media,
                start,
                story: c.story_text || undefined,
                editHref: canEdit ? editHref : undefined,
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
