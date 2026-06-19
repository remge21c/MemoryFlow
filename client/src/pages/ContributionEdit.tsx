import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContributionDTO, MediaDTO, SceneDTO } from '@memoryflow/shared';
import { formatSeconds } from '@memoryflow/shared';
import { apiDelete, apiForm, apiGet, apiPatch, apiPost } from '../lib/api';
import { AppShell, TopBar } from '../components/AppShell';
import { Button, Card, Icon, Pill, Spinner, TextArea, ErrorNote } from '../components/ui';
import { FileDropzone } from '../components/FileDropzone';
import { MediaCarousel } from '../components/MediaCarousel';
import { useMe } from '../lib/auth';

interface SceneResp {
  scene: SceneDTO;
  locked: boolean;
}

export default function ContributionEdit() {
  const { pid, sid } = useParams();
  const qc = useQueryClient();
  const key = ['scene', pid, sid];
  const { data: me } = useMe();

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => apiGet<SceneResp>(`/projects/${pid}/schedules/${sid}/scene`),
  });

  const { data: projData } = useQuery({
    queryKey: ['project-schedules', pid],
    queryFn: () => apiGet<{ project: { schedule_type: string }; days: { day_index: number; date: string | null; schedules: any[] }[] }>(`/projects/${pid}`),
    enabled: !!pid,
  });

  const allSchedules = projData?.days.flatMap((d) =>
    d.schedules.map((s) => ({
      id: s.id,
      dayIndex: d.day_index,
      title: s.title,
      time: s.time,
      place: s.place,
    }))
  ) ?? [];

  const [story, setStory] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState('');

  const createMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('story_text', story);
      files.forEach((f) => fd.append('files', f));
      return apiForm('POST', `/projects/${pid}/schedules/${sid}/contributions`, fd);
    },
    onSuccess: () => {
      setStory('');
      setFiles([]);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => setErr((e as Error).message),
  });

  if (isLoading) return <AppShell><Spinner /></AppShell>;
  if (!data) return <AppShell><TopBar title="장면" /></AppShell>;

  const isAdmin = me?.user?.is_admin ?? false;
  const { scene, locked } = data;
  const effectiveLocked = locked && !isAdmin;
  const isSeq = projData?.project?.schedule_type === 'sequence';

  const saveTitleMut = useMutation({
    mutationFn: (title: string) => apiPatch(`/schedules/${sid}`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const mine = isAdmin
    ? scene.contributions
    : scene.contributions.filter((c) => c.is_mine);
  const others = isAdmin
    ? []
    : scene.contributions.filter((c) => !c.is_mine);

  const seqPrefix = isSeq ? `#${scene.schedule.day_index}` : null;
  const subtitle = [
    seqPrefix,
    `${scene.schedule.time ?? ''} ${scene.schedule.place ?? ''}`.trim() || null,
  ].filter(Boolean).join(' · ');

  return (
    <AppShell>
      <TopBar
        title={scene.schedule.title}
        subtitle={subtitle || undefined}
        onTitleSave={isAdmin ? (t) => saveTitleMut.mutate(t) : undefined}
      />
      <div className="flex items-center gap-2 mb-6">
        <Pill tone="muted">예상 {formatSeconds(scene.scene_seconds)}</Pill>
        {scene.schedule.category ? <Pill tone="muted">{scene.schedule.category}</Pill> : null}
      </div>

      {effectiveLocked ? (
        <div role="status" className="mb-6 flex items-center gap-2 rounded-md border border-outline/20 bg-surface-container px-3.5 py-3 text-on-surface text-body-md">
          <Icon name="lock" className="text-[18px] text-primary shrink-0" />
          <span>관리자가 편집을 잠갔습니다. 지금은 읽기 전용이에요.</span>
        </div>
      ) : null}

      {/* 내 기록 */}
      {mine.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-title-sm font-semibold mb-3">내 기록</h2>
          <div className="space-y-3">
            {mine.map((c) => (
              <MyContribution key={c.id} c={c} locked={effectiveLocked} onChange={() => qc.invalidateQueries({ queryKey: key })} allSchedules={allSchedules} isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 새 기록 추가 */}
      {!effectiveLocked ? (
        <section className="mb-8">
          <h2 className="text-title-sm font-semibold mb-3">{mine.length ? '기록 더 올리기' : '이 순간을 기록하기'}</h2>
          <Card className="p-4 space-y-3">
            <FileDropzone files={files} onChange={setFiles} />
            <TextArea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="이 순간이 어땠는지 한두 문장으로 적어주세요."
              rows={3}
            />
            {err ? <ErrorNote message={err} /> : null}
            <Button
              icon="upload"
              loading={createMut.isPending}
              disabled={!story.trim() && files.length === 0}
              onClick={() => {
                setErr('');
                createMut.mutate();
              }}
            >
              올리기
            </Button>
          </Card>
        </section>
      ) : null}

      {/* 다른 사람들의 기록 (중복 보여주기, PRD 6장) */}
      {others.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-title-sm font-semibold mb-1">다른 사람들의 기록</h2>
          <p className="text-label-sm text-outline mb-3">이미 올라온 사진이 있으면 같은 컷은 안 올려도 돼요.</p>
          <div className="space-y-3">
            {others.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-primary">{c.uploader_name}</span>
                </div>
                <MediaCarousel media={c.media} />
                {c.story_text ? <p className="text-body-md text-on-surface-variant mt-2">{c.story_text}</p> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

/** 영상 구간 자르기 모달 — 서버 재인코딩으로 선택 구간만 남기고 교체 (원본 보관 없음). */
function TrimVideoModal({ media, onClose, onDone }: { media: MediaDTO; onClose: () => void; onDone: () => void }) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const [dur, setDur] = useState(media.duration_seconds ?? 0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(media.duration_seconds ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function onMeta() {
    const d = vidRef.current?.duration;
    if (d && isFinite(d)) {
      setDur(d);
      setEnd((e) => (e > 0 ? Math.min(e, d) : d));
    }
  }

  function previewRange() {
    const v = vidRef.current;
    if (!v) return;
    v.currentTime = start;
    v.play();
    const stop = () => {
      if (v.currentTime >= end) {
        v.pause();
        v.removeEventListener('timeupdate', stop);
      }
    };
    v.addEventListener('timeupdate', stop);
  }

  async function apply() {
    if (!window.confirm(`선택 구간(${fmtTime(start)} ~ ${fmtTime(end)})만 남기고 영상이 교체됩니다.\n원본은 복구할 수 없습니다. 계속할까요?`)) return;
    setBusy(true);
    setErr('');
    try {
      await apiPost(`/media/${media.id}/trim`, {
        start_seconds: Math.round(start * 10) / 10,
        end_seconds: Math.round(end * 10) / 10,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={busy ? undefined : onClose}>
      <div className="bg-surface-lowest rounded-xl border border-outline/10 p-5 max-w-lg w-full shadow-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-title-md font-bold mb-3 flex items-center gap-2">
          <Icon name="content_cut" className="text-primary" /> 영상 자르기
        </h3>
        <video ref={vidRef} src={media.url} controls onLoadedMetadata={onMeta} className="w-full max-h-64 rounded-lg bg-black mb-4" />
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-label-sm text-on-surface-variant mb-1">
              <span>시작점</span>
              <span>{fmtTime(start)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={dur}
              step={0.1}
              value={start}
              disabled={busy}
              onChange={(e) => {
                const v = Math.max(0, Math.min(Number(e.target.value), end - 1));
                setStart(v);
                if (vidRef.current) vidRef.current.currentTime = v;
              }}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <div className="flex justify-between text-label-sm text-on-surface-variant mb-1">
              <span>끝점</span>
              <span>{fmtTime(end)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={dur}
              step={0.1}
              value={end}
              disabled={busy}
              onChange={(e) => {
                const v = Math.min(dur, Math.max(Number(e.target.value), start + 1));
                setEnd(v);
                if (vidRef.current) vidRef.current.currentTime = v;
              }}
              className="w-full accent-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-body-md text-on-surface-variant">
              선택 구간 <b className="text-on-surface">{fmtTime(Math.max(0, end - start))}</b> / 전체 {fmtTime(dur)}
            </p>
            <button onClick={previewRange} disabled={busy} className="text-label-sm text-primary font-semibold flex items-center gap-1">
              <Icon name="play_arrow" className="text-[18px]" /> 구간 미리보기
            </button>
          </div>
          {err ? <ErrorNote message={err} /> : null}
          {busy ? (
            <p className="text-body-md text-primary flex items-center gap-2">
              <Icon name="hourglass_top" className="text-[18px]" /> 영상을 자르는 중입니다… 길이에 따라 수십 초 걸릴 수 있어요.
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>취소</Button>
            <Button type="button" icon="content_cut" onClick={apply} loading={busy} disabled={end - start < 1}>자르기</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScheduleItem {
  id: number;
  dayIndex: number;
  title: string;
  time: string | null;
  place: string | null;
}

function MyContribution({ c, locked, onChange, allSchedules, isAdmin }: { c: ContributionDTO; locked: boolean; onChange: () => void; allSchedules: ScheduleItem[]; isAdmin: boolean }) {
  const [text, setText] = useState(c.story_text ?? '');
  const [dirty, setDirty] = useState(false);
  const [trimTarget, setTrimTarget] = useState<MediaDTO | null>(null);
  const addRef = useRef<HTMLInputElement>(null);

  const saveMut = useMutation({
    mutationFn: () => apiPatch(`/contributions/${c.id}`, { story_text: text }),
    onSuccess: () => {
      setDirty(false);
      onChange();
    },
  });
  const delMut = useMutation({ mutationFn: () => apiDelete(`/contributions/${c.id}`), onSuccess: onChange });
  const delMediaMut = useMutation({ mutationFn: (id: number) => apiDelete(`/media/${id}`), onSuccess: onChange });
  const addMediaMut = useMutation({
    mutationFn: (fl: FileList) => {
      const fd = new FormData();
      Array.from(fl).forEach((f) => fd.append('files', f));
      return apiForm('POST', `/contributions/${c.id}/media`, fd);
    },
    onSuccess: () => {
      if (addRef.current) addRef.current.value = '';
      onChange();
    },
  });

  return (
    <Card className="p-4">
      {(!c.is_mine || isAdmin) && (
        <div className="flex items-center gap-2 mb-3 bg-secondary-container/30 px-3 py-1.5 rounded-lg border border-outline/10">
          <Icon name="person" className="text-primary text-[18px]" />
          <span className="font-semibold text-body-md text-on-surface-variant">{c.uploader_name}님의 기록</span>
        </div>
      )}
      <MediaCarousel
        media={c.media}
        onDelete={locked ? undefined : (id) => delMediaMut.mutate(id)}
        deletingId={delMediaMut.isPending ? delMediaMut.variables : null}
        onTrimVideo={locked ? undefined : setTrimTarget}
      />
      {trimTarget ? (
        <TrimVideoModal
          media={trimTarget}
          onClose={() => setTrimTarget(null)}
          onDone={() => { setTrimTarget(null); onChange(); }}
        />
      ) : null}
      
      {!locked && allSchedules.length > 0 && (
        <div className="mt-3">
          <label className="block text-label-sm text-outline uppercase tracking-wider mb-1.5">일정(장면) 이동</label>
          <select
            value={c.schedule_id}
            onChange={async (e) => {
              const targetSid = Number(e.target.value);
              if (targetSid === c.schedule_id) return;
              const confirmMove = window.confirm('이 기여를 선택하신 일정으로 이동하시겠습니까?\n이동 후에는 현재 화면에서 이 기록이 제외되며, 지정한 일정 화면으로 이동됩니다.');
              if (confirmMove) {
                try {
                  await apiPatch(`/contributions/${c.id}`, { schedule_id: targetSid });
                  onChange();
                } catch (err: any) {
                  alert(err.message || '일정 이동 중 오류가 발생했습니다.');
                }
              }
            }}
            className="w-full rounded-md border border-outline/30 bg-surface-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={locked}
          >
            {allSchedules.map((s) => (
              <option key={s.id} value={s.id}>
                {isSeq ? `#${s.dayIndex}` : `Day ${s.dayIndex}`} - {s.title} {s.time ? `(${s.time})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      {!locked ? (
        <>
          <p className="text-label-sm text-outline uppercase tracking-wider mt-3 mb-1.5">스토리 메모</p>
          <TextArea
            value={text}
            onChange={(e) => { setText(e.target.value); setDirty(true); }}
            placeholder="이 순간을 어떻게 기억하고 싶은지 적어주세요."
            rows={3}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button onClick={() => addRef.current?.click()} className="min-h-[44px] flex items-center gap-1 text-label-sm text-primary">
                <Icon name="add_photo_alternate" className="text-[18px]" /> 사진 추가
              </button>
              <input ref={addRef} type="file" multiple accept="image/*,video/*" hidden
                onChange={(e) => e.target.files && addMediaMut.mutate(e.target.files)} />
              <button onClick={() => delMut.mutate()} className="min-h-[44px] flex items-center gap-1 text-label-sm text-error">
                <Icon name="delete" className="text-[18px]" /> 삭제
              </button>
            </div>
            <Button
              variant="secondary"
              className="h-9 px-4 text-label-sm"
              loading={saveMut.isPending}
              disabled={!dirty}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isSuccess && !dirty ? '저장됨 ✓' : '저장'}
            </Button>
          </div>
        </>
      ) : (
        text ? <p className="mt-3 text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">{text}</p> : null
      )}
    </Card>
  );
}
