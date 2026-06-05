import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContributionDTO, SceneDTO } from '@memoryflow/shared';
import { formatSeconds } from '@memoryflow/shared';
import { apiDelete, apiForm, apiGet, apiPatch } from '../lib/api';
import { AppShell, TopBar } from '../components/AppShell';
import { Button, Card, Icon, Pill, Spinner, TextArea, ErrorNote } from '../components/ui';
import { FileDropzone } from '../components/FileDropzone';

interface SceneResp {
  scene: SceneDTO;
  locked: boolean;
}

export default function ContributionEdit() {
  const { pid, sid } = useParams();
  const qc = useQueryClient();
  const key = ['scene', pid, sid];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => apiGet<SceneResp>(`/projects/${pid}/schedules/${sid}/scene`),
  });

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

  const { scene, locked } = data;
  const mine = scene.contributions.filter((c) => c.is_mine);
  const others = scene.contributions.filter((c) => !c.is_mine);

  return (
    <AppShell>
      <TopBar title={scene.schedule.title} subtitle={`${scene.schedule.time ?? ''} ${scene.schedule.place ?? ''}`.trim()} />
      <div className="flex items-center gap-2 mb-6">
        <Pill tone="muted">예상 {formatSeconds(scene.scene_seconds)}</Pill>
        {scene.schedule.category ? <Pill tone="muted">{scene.schedule.category}</Pill> : null}
      </div>

      {locked ? (
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
              <MyContribution key={c.id} c={c} locked={locked} onChange={() => qc.invalidateQueries({ queryKey: key })} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 새 기록 추가 */}
      {!locked ? (
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

function MediaCarousel({ media, onDelete }: { media: ContributionDTO['media']; onDelete?: (id: number) => void }) {
  const [idx, setIdx] = useState(0);
  if (media.length === 0) return null;

  const safeIdx = Math.min(idx, media.length - 1);
  const cur = media[safeIdx];
  if (!cur) return null;

  return (
    <div className="relative rounded-xl overflow-hidden bg-surface-container aspect-[4/3]">
      <img
        src={cur.thumb_url ?? cur.url}
        alt={cur.type === 'video' ? '동영상 썸네일' : '기여 이미지'}
        className="w-full h-full object-cover"
        loading="lazy"
      />
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

      {/* 삭제 버튼 */}
      {onDelete ? (
        <button
          onClick={() => {
            onDelete(cur.id);
            setIdx((v) => Math.max(0, v - 1));
          }}
          aria-label="이 사진 삭제"
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      ) : null}

      {/* 이전 버튼 */}
      {safeIdx > 0 ? (
        <button
          onClick={() => setIdx((v) => v - 1)}
          aria-label="이전 사진"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Icon name="chevron_left" className="text-[22px]" />
        </button>
      ) : null}

      {/* 다음 버튼 */}
      {safeIdx < media.length - 1 ? (
        <button
          onClick={() => setIdx((v) => v + 1)}
          aria-label="다음 사진"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Icon name="chevron_right" className="text-[22px]" />
        </button>
      ) : null}

      {/* 장수 표시 */}
      {media.length > 1 ? (
        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
          {safeIdx + 1} / {media.length}
        </span>
      ) : null}

      {/* 점 인디케이터 */}
      {media.length > 1 && media.length <= 4 ? (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`${i + 1}번째 사진`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === safeIdx ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MyContribution({ c, locked, onChange }: { c: ContributionDTO; locked: boolean; onChange: () => void }) {
  const [text, setText] = useState(c.story_text ?? '');
  const [dirty, setDirty] = useState(false);
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
      <MediaCarousel media={c.media} onDelete={locked ? undefined : (id) => delMediaMut.mutate(id)} />
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
