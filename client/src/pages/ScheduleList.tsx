import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MediaDTO, ScheduleDTO } from '@memoryflow/shared';
import { apiDelete, apiForm, apiGet, apiPatch } from '../lib/api';
import { AppShell } from '../components/AppShell';
import { Card, EmptyState, Icon, Spinner } from '../components/ui';
import { MediaLightbox } from '../components/MediaLightbox';
import { useActiveProject } from '../stores/activeProject';

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

export default function ScheduleList() {
  const { pid } = useParams();
  const setActive = useActiveProject((s) => s.setActive);
  const qc = useQueryClient();
  const [lb, setLb] = useState<{ items: MediaDTO[]; start: number; story?: string; isMine?: boolean; contributionId?: number } | null>(null);

  const saveStory = useCallback(async (contributionId: number, text: string) => {
    await apiPatch(`/contributions/${contributionId}`, { story_text: text });
    qc.invalidateQueries({ queryKey: ['feed', pid] });
  }, [pid, qc]);

  const deleteMedia = useCallback(async (mediaId: number) => {
    await apiDelete(`/media/${mediaId}`);
    qc.invalidateQueries({ queryKey: ['feed', pid] });
  }, [pid, qc]);

  const addMedia = useCallback(async (contributionId: number, files: FileList) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    await apiForm('POST', `/contributions/${contributionId}/media`, fd);
    qc.invalidateQueries({ queryKey: ['feed', pid] });
  }, [pid, qc]);

  const { data, isLoading } = useQuery({
    queryKey: ['feed', pid],
    queryFn: () => apiGet<FeedData>(`/projects/${pid}/feed`),
  });

  useEffect(() => {
    if (data) setActive({ id: data.project.id, name: data.project.name, org_name: data.project.org_name ?? undefined });
  }, [data, setActive]);

  if (isLoading) return <AppShell><Spinner /></AppShell>;
  if (!data) return <AppShell><EmptyState icon="error" title="프로젝트를 찾을 수 없습니다" /></AppShell>;

  const hasAnySchedule = data.days.some((d) => d.schedules.length > 0);

  return (
    <AppShell>
      {/* 헤더 */}
      <div className="mb-5 min-w-0">
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
                <SceneBlock key={s.id} pid={pid!} schedule={s} onOpen={(items, start, story, isMine, contributionId) => setLb({ items, start, story, isMine, contributionId })} />
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
          isMine={lb.isMine}
          onSaveStory={lb.contributionId ? (text) => saveStory(lb.contributionId!, text) : undefined}
          onDeleteMedia={lb.contributionId ? deleteMedia : undefined}
          onAddMedia={lb.contributionId ? (files) => addMedia(lb.contributionId!, files) : undefined}
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
}: {
  pid: string;
  schedule: FeedSchedule;
  onOpen: (items: MediaDTO[], start: number, story?: string, isMine?: boolean, contributionId?: number) => void;
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
            <Bubble key={c.id} c={c} pid={pid} scheduleId={schedule.id} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function Bubble({
  c,
  onOpen,
}: {
  c: FeedContribution;
  pid: string;
  scheduleId: number;
  onOpen: (items: MediaDTO[], start: number, story?: string, isMine?: boolean, contributionId?: number) => void;
}) {
  const mine = c.is_mine;

  return (
    <div>
      {/* 사진/영상: 전체 폭 */}
      {c.media.length > 0 ? (
        <>
          {!mine ? <p className="text-label-sm text-on-surface-variant mb-1">{c.uploader_name}</p> : null}
          <MediaBundle media={c.media} story={c.story_text} isMine={mine} contributionId={c.id} onOpen={onOpen} />
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

function MediaBundle({ media, story, isMine, contributionId, onOpen }: {
  media: MediaDTO[];
  story?: string | null;
  isMine?: boolean;
  contributionId?: number;
  onOpen: (items: MediaDTO[], start: number, story?: string, isMine?: boolean, contributionId?: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const cur = media[idx];
  if (!cur) return null;

  return (
    <div className="relative rounded-xl overflow-hidden bg-surface-container aspect-[4/3]">
      {/* 현재 미디어 */}
      <button
        className="w-full h-full"
        onClick={() => onOpen(media, idx, story ?? undefined, isMine, contributionId)}
        aria-label="전체화면으로 보기"
      >
        <img src={cur.thumb_url ?? cur.url} loading="lazy" className="w-full h-full object-cover" alt="" />
        {cur.type === 'video' ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Icon name="play_circle" fill className="text-white text-[40px]" />
          </span>
        ) : null}
        {cur.type === 'video' && cur.duration_seconds ? (
          <span className="absolute bottom-2 left-2 bg-black/55 text-white text-[11px] px-1.5 py-0.5 rounded">
            {Math.round(cur.duration_seconds)}s
          </span>
        ) : null}
      </button>

      {/* 이전 버튼 */}
      {idx > 0 ? (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((v) => v - 1); }}
          aria-label="이전 사진"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Icon name="chevron_left" className="text-[22px]" />
        </button>
      ) : null}

      {/* 다음 버튼 */}
      {idx < media.length - 1 ? (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((v) => v + 1); }}
          aria-label="다음 사진"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Icon name="chevron_right" className="text-[22px]" />
        </button>
      ) : null}

      {/* 장수 표시 */}
      {media.length > 1 ? (
        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
          {idx + 1} / {media.length}
        </span>
      ) : null}

      {/* 하단 점 인디케이터 (4장 이하일 때) */}
      {media.length > 1 && media.length <= 4 ? (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              aria-label={`${i + 1}번째 사진`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
