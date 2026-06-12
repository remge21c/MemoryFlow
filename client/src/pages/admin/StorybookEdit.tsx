import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MediaDTO, SceneDTO, StorybookDTO } from '@memoryflow/shared';
import { formatSeconds } from '@memoryflow/shared';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import { AppShell } from '../../components/AppShell';
import { Button, Card, Icon, Pill, Spinner, TextArea, ErrorNote } from '../../components/ui';
import { MediaLightbox } from '../../components/MediaLightbox';

interface SceneResp {
  scene: SceneDTO;
  storybook: StorybookDTO;
}
interface SummaryScene {
  schedule_id: number;
  day_index: number;
  title: string;
}

export default function StorybookEdit() {
  const { pid, sid } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const sceneKey = ['scene-edit', pid, sid];

  const summary = useQuery({
    queryKey: ['storybook', pid],
    queryFn: () => apiGet<{ scenes: SummaryScene[] }>(`/projects/${pid}/storybook`),
  });
  const { data, isLoading } = useQuery({
    queryKey: sceneKey,
    queryFn: () => apiGet<SceneResp>(`/projects/${pid}/storybook/scenes/${sid}`),
  });

  const [narration, setNarration] = useState('');
  const [draft, setDraft] = useState('');
  const [secInput, setSecInput] = useState('');
  const [aiErr, setAiErr] = useState('');
  const [lb, setLb] = useState<{ items: MediaDTO[]; start: number } | null>(null);

  useEffect(() => {
    if (data) {
      setNarration(data.scene.narration);
      setDraft('');
      setAiErr('');
      setSecInput(data.scene.schedule.photo_seconds != null ? String(data.scene.schedule.photo_seconds) : '');
    }
  }, [data?.scene.schedule.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetchScene = () => {
    qc.invalidateQueries({ queryKey: sceneKey });
    qc.invalidateQueries({ queryKey: ['storybook', pid] });
  };

  const toggleMut = useMutation({
    mutationFn: ({ id, included }: { id: number; included: boolean }) => apiPatch(`/storybook/media/${id}`, { included }),
    onSuccess: refetchScene,
  });
  const secMut = useMutation({
    mutationFn: (val: number | null) => apiPatch(`/schedules/${sid}`, { photo_seconds: val }),
    onSuccess: refetchScene,
  });
  const saveMut = useMutation({
    mutationFn: () => apiPost(`/projects/${pid}/storybook/narration`, { schedule_id: Number(sid), narration_text: narration }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['storybook', pid] }),
  });
  const mergeMut = useMutation({
    mutationFn: () => apiPost<{ draft: string }>(`/projects/${pid}/storybook/ai/merge`, { schedule_id: Number(sid) }),
    onSuccess: (r) => setDraft(r.draft),
    onError: (e) => setAiErr((e as Error).message),
  });
  const sumMut = useMutation({
    mutationFn: () => apiPost<{ draft: string }>(`/projects/${pid}/storybook/ai/summarize`, { schedule_id: Number(sid), narration_text: narration }),
    onSuccess: (r) => setDraft(r.draft),
    onError: (e) => setAiErr((e as Error).message),
  });

  if (isLoading || !data) return <AppShell><Spinner /></AppShell>;

  const { scene, storybook } = data;
  const locked = storybook.status === 'approved';
  const scenes = summary.data?.scenes ?? [];
  const idx = scenes.findIndex((s) => s.schedule_id === Number(sid));
  const prev = idx > 0 ? scenes[idx - 1] : null;
  const next = idx >= 0 && idx < scenes.length - 1 ? scenes[idx + 1] : null;
  const goScene = (s: SummaryScene) => nav(`/admin/projects/${pid}/storybook/scenes/${s.schedule_id}`);

  const len = narration.trim().length;
  const over = len > scene.target_chars && scene.target_chars > 0;
  const aiLoading = mergeMut.isPending || sumMut.isPending;

  return (
    <AppShell max="max-w-2xl lg:max-w-5xl">
      {/* 1) 장면 페이저 */}
      <section className="flex items-center justify-between mb-5 border-b border-outline-variant/20 pb-3">
        <button onClick={() => nav(`/admin/projects/${pid}/storybook`)} className="text-on-surface-variant hover:text-primary">
          <Icon name="grid_view" className="text-[22px]" />
        </button>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <button disabled={!prev} onClick={() => prev && goScene(prev)} className="disabled:opacity-30 hover:text-primary">
            <Icon name="chevron_left" />
          </button>
          <span className="text-title-sm font-semibold text-on-surface text-center">
            Day {scene.schedule.day_index} · {scene.schedule.title}
          </span>
          <button disabled={!next} onClick={() => next && goScene(next)} className="disabled:opacity-30 hover:text-primary">
            <Icon name="chevron_right" />
          </button>
        </div>
        <Pill tone="muted">{formatSeconds(scene.scene_seconds)}</Pill>
      </section>

      {locked ? (
        <div className="mb-5 flex items-center gap-2 rounded-md bg-secondary-container px-3.5 py-3 text-on-secondary-container text-body-md">
          <Icon name="lock" className="text-[18px]" /> 승인된 스토리북입니다 (읽기 전용)
        </div>
      ) : null}

      {/* 2) 미디어 선별 그리드 */}
      <section className="mb-6">
        <h3 className="text-title-sm font-semibold mb-2">사진/영상 선별</h3>
        {scene.media.length === 0 ? (
          <p className="text-body-md text-outline">아직 업로드된 미디어가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {scene.media.map((m, idx) => (
              <MediaToggle
                key={m.id}
                m={m}
                locked={locked}
                onToggle={() => toggleMut.mutate({ id: m.id, included: !m.included })}
                onPreview={() => setLb({ items: scene.media, start: idx })}
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 mt-3">
          <span className="text-label-sm text-on-surface-variant">사진 노출(초):</span>
          <input
            type="number"
            min={1}
            max={60}
            value={secInput}
            disabled={locked}
            placeholder="기본"
            onChange={(e) => setSecInput(e.target.value)}
            onBlur={() => {
              const v = secInput === '' ? null : Number(secInput);
              if (v !== scene.schedule.photo_seconds) secMut.mutate(v);
            }}
            className="w-20 rounded-md border border-outline/30 bg-surface-lowest px-2 py-1.5 text-body-md text-center"
          />
        </div>
      </section>

      {/* 3) 관점별 스토리 */}
      <section className="mb-6">
        <h3 className="text-title-sm font-semibold mb-2">기록된 생각들</h3>
        <div className="space-y-2">
          {scene.contributions.length === 0 ? (
            <p className="text-body-md text-outline">업로더의 스토리가 아직 없습니다.</p>
          ) : (
            scene.contributions.map((c) => (
              <div key={c.id} className="flex items-start justify-between p-3.5 bg-surface-lowest rounded-md border border-outline/10">
                <div className="flex gap-3 min-w-0">
                  <span className="font-bold text-primary shrink-0">{c.uploader_name}</span>
                  <p className="text-body-md text-on-surface-variant break-words">
                    {c.story_text || <span className="italic text-outline">작성된 내용 없음</span>}
                  </p>
                </div>
                {!locked && (
                  <Link
                    to={`/projects/${pid}/schedules/${sid}`}
                    className="text-label-sm text-primary hover:underline font-semibold shrink-0 ml-4 flex items-center gap-0.5"
                    title="기록 수정/삭제"
                  >
                    <Icon name="edit" className="text-[14px]" />
                    수정/삭제
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
        {!locked ? (
          <div className="flex justify-center mt-4">
            <Button icon="auto_awesome" loading={mergeMut.isPending} disabled={aiLoading} onClick={() => { setAiErr(''); mergeMut.mutate(); }}>
              대본 초안 생성
            </Button>
          </div>
        ) : null}
      </section>

      {/* AI 초안 (적용 전 별도 표시, PRD 9장) */}
      {draft ? (
        <Card className="p-4 mb-4 border-primary/30">
          <div className="flex items-center gap-1.5 mb-2 text-primary">
            <Icon name="auto_awesome" className="text-[18px]" />
            <span className="text-label-sm font-semibold uppercase tracking-wide">AI 초안</span>
          </div>
          <p className="text-body-md text-on-surface whitespace-pre-line">{draft}</p>
          <div className="flex gap-2 mt-3">
            <Button className="h-9 px-4 text-label-sm" onClick={() => { setNarration(draft); setDraft(''); }}>적용</Button>
            <Button variant="ghost" className="h-9 px-4 text-label-sm" onClick={() => setDraft('')}>버리기</Button>
          </div>
        </Card>
      ) : null}
      {aiErr ? (
        <div className="mb-4">
          <ErrorNote message={aiErr} />
          <div className="flex justify-center mt-2">
            <Button variant="secondary" className="h-9 px-4 text-label-sm" icon="refresh" onClick={() => { setAiErr(''); mergeMut.mutate(); }}>다시 시도</Button>
          </div>
        </div>
      ) : null}

      {/* 4) 내레이션 에디터 */}
      <section className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-label-sm text-outline uppercase tracking-wider">내레이션</label>
          {!locked ? (
            <Button variant="ghost" className="h-8 px-3 text-label-sm" icon="shutter_speed" loading={sumMut.isPending} disabled={aiLoading || !narration.trim()} onClick={() => { setAiErr(''); sumMut.mutate(); }}>
              길이에 맞게 요약
            </Button>
          ) : null}
        </div>
        <TextArea value={narration} disabled={locked} onChange={(e) => setNarration(e.target.value)} rows={6} placeholder="내레이션을 입력하세요…" />
        <p className="text-label-sm mt-1.5 flex items-center gap-1 text-on-surface-variant">
          <Icon name="info" className="text-[15px]" />
          {formatSeconds(scene.scene_seconds)} 분량 ≈ 약 {scene.target_chars}자 (현재 <b>{len}자</b>
          {over ? <span className="text-error font-semibold"> — 조금 길어요</span> : null})
        </p>
      </section>

      {!locked ? (
        <div className="flex justify-end gap-2 sticky bottom-3">
          <Button icon="save" loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isSuccess ? '저장됨' : '내레이션 저장'}
          </Button>
        </div>
      ) : null}

      {lb ? (
        <MediaLightbox
          items={lb.items}
          start={lb.start}
          onToggleInclude={(mediaId) => {
            const m = scene.media.find((x) => x.id === mediaId);
            if (m) toggleMut.mutate({ id: mediaId, included: !m.included });
          }}
          onClose={() => setLb(null)}
        />
      ) : null}
    </AppShell>
  );
}

function MediaToggle({
  m,
  locked,
  onToggle,
  onPreview,
}: {
  m: MediaDTO;
  locked: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={`relative aspect-square rounded-lg overflow-hidden border border-outline/10 ${
        m.included ? 'linen-shadow' : 'opacity-40'
      }`}
    >
      {/* 이미지 클릭 시 미리보기 열기 */}
      <button
        onClick={onPreview}
        className="w-full h-full block focus-visible:outline-none"
        aria-label="사진 미리보기"
      >
        <img src={m.thumb_url ?? m.url} className="w-full h-full object-cover" loading="lazy" />
      </button>

      {/* 체크박스 클릭 시 포함 여부 토글 */}
      {!locked ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="absolute top-1 left-1 p-0.5 rounded bg-black/40 hover:bg-black/60 text-white transition-colors"
          aria-label={m.included ? '제외하기' : '선택하기'}
        >
          <Icon name={m.included ? 'check_box' : 'check_box_outline_blank'} fill={m.included} className="text-[18px]" />
        </button>
      ) : (
        <span className="absolute top-1 left-1 p-0.5 rounded bg-black/40 text-white">
          <Icon name={m.included ? 'check_box' : 'check_box_outline_blank'} fill={m.included} className="text-[18px]" />
        </span>
      )}

      {m.type === 'video' ? (
        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          🎬 {m.duration_seconds ? `${Math.round(m.duration_seconds)}s` : ''}
        </span>
      ) : null}
    </div>
  );
}
