// 영상 구간 자르기 모달 — 서버 재인코딩으로 선택 구간만 남기고 교체 (원본 보관 없음).
// 기록 페이지(ContributionEdit)와 라이트박스(MediaLightbox) 편집 모드에서 공용으로 사용.
import { useRef, useState } from 'react';
import type { MediaDTO } from '@memoryflow/shared';
import { apiPost } from '../lib/api';
import { Button, Icon, ErrorNote } from './ui';

function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

export function TrimVideoModal({ media, onClose, onDone }: { media: MediaDTO; onClose: () => void; onDone: () => void }) {
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
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={busy ? undefined : onClose}>
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
