import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContributionDTO, MediaDTO, SceneDTO } from '@memoryflow/shared';
import { formatSeconds } from '@memoryflow/shared';
import { apiDelete, apiForm, apiGet, apiPatch } from '../lib/api';
import { AppShell, TopBar } from '../components/AppShell';
import { Button, Card, Icon, Pill, Spinner, TextArea, ErrorNote } from '../components/ui';
import { FileDropzone } from '../components/FileDropzone';
import { MediaCarousel } from '../components/MediaCarousel';
import { TrimVideoModal } from '../components/TrimVideoModal';
import { useMe } from '../lib/auth';

interface SceneResp {
  scene: SceneDTO;
  locked: boolean;
}

export default function ContributionEdit() {
  const { pid, sid } = useParams();
  const nav = useNavigate();
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
      // 저장 후 업로더 메인(활성 프로젝트 피드)으로 이동
      nav(`/projects/${pid}`);
    },
    onError: (e) => setErr((e as Error).message),
  });

  const saveTitleMut = useMutation({
    mutationFn: (title: string) => apiPatch(`/schedules/${sid}`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  // 라이트박스 "수정"으로 넘어오면 #c-<id> 앵커의 해당 기록으로 스크롤 + 잠깐 강조
  const { hash } = useLocation();
  useEffect(() => {
    if (!data || !hash) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary', 'rounded-lg');
    const t = setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'rounded-lg'), 1600);
    return () => clearTimeout(t);
  }, [data, hash]);

  if (isLoading) return <AppShell><Spinner /></AppShell>;
  if (!data) return <AppShell><TopBar title="장면" /></AppShell>;

  const isAdmin = me?.user?.is_admin ?? false;
  const { scene, locked } = data;
  const effectiveLocked = locked && !isAdmin;
  const isSeq = projData?.project?.schedule_type === 'sequence';

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
              <div key={c.id} id={`c-${c.id}`} className="scroll-mt-20 transition-shadow">
                <MyContribution c={c} locked={effectiveLocked} onChange={() => qc.invalidateQueries({ queryKey: key })} allSchedules={allSchedules} isAdmin={isAdmin} isSeq={isSeq} />
              </div>
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

interface ScheduleItem {
  id: number;
  dayIndex: number;
  title: string;
  time: string | null;
  place: string | null;
}

function MyContribution({ c, locked, onChange, allSchedules, isAdmin, isSeq }: { c: ContributionDTO; locked: boolean; onChange: () => void; allSchedules: ScheduleItem[]; isAdmin: boolean; isSeq: boolean }) {
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
