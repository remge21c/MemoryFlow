import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaDTO } from '@memoryflow/shared';
import { Icon } from './ui';

export function MediaLightbox({
  items: initialItems,
  start,
  story,
  isMine,
  onSaveStory,
  onDeleteMedia,
  onAddMedia,
  onToggleInclude, // 추가
  onClose,
}: {
  items: MediaDTO[];
  start: number;
  story?: string;
  isMine?: boolean;
  onSaveStory?: (text: string) => Promise<void>;
  onDeleteMedia?: (mediaId: number) => Promise<void>;
  onAddMedia?: (files: FileList) => Promise<void>;
  onToggleInclude?: (mediaId: number) => void; // 추가
  onClose: () => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [i, setI] = useState(start);
  const [editMode, setEditMode] = useState(false);
  const [currentStory, setCurrentStory] = useState(story ?? '');
  const [editText, setEditText] = useState(story ?? '');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const prev = useCallback(() => setI((v) => (v > 0 ? v - 1 : v)), []);
  const next = useCallback(() => setI((v) => (v < items.length - 1 ? v + 1 : v)), [items.length]);

  // 부모 컴포넌트의 데이터 변경 시 items 동기화
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // 사진 선별 토글 처리
  function handleToggleInclude() {
    if (!onToggleInclude) return;
    const mediaId = cur.id;
    // 로컬 상태를 먼저 토글하여 즉각 피드백 제공
    setItems((prevItems) =>
      prevItems.map((m) => (m.id === mediaId ? { ...m, included: !m.included } : m))
    );
    onToggleInclude(mediaId);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editMode) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next, editMode]);

  async function handleSave() {
    if (!onSaveStory) return;
    setSaving(true);
    try {
      await onSaveStory(editText);
      setCurrentStory(editText);
      setEditMode(false);
    } finally { setSaving(false); }
  }

  async function handleDeleteMedia(mediaId: number) {
    if (!onDeleteMedia) return;
    setDeletingId(mediaId);
    try {
      await onDeleteMedia(mediaId);
      const next = items.filter((m) => m.id !== mediaId);
      if (next.length === 0) { onClose(); return; }
      setItems(next);
      setI((v) => Math.min(v, next.length - 1));
    } finally { setDeletingId(null); }
  }

  async function handleAddMedia(files: FileList) {
    if (!onAddMedia) return;
    setAdding(true);
    try { await onAddMedia(files); onClose(); }
    finally { setAdding(false); }
  }

  const cur = items[i];
  if (!cur) return null;

  const canEdit = isMine && (onSaveStory || onDeleteMedia || onAddMedia);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={editMode ? undefined : onClose}
    >
      {/* 상단 바 */}
      <div
        className="flex items-center justify-between px-4 h-14 text-white/90 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-body-md">{i + 1} / {items.length}</span>
        <div className="flex items-center gap-2">
          {onToggleInclude ? (
            <button
              onClick={handleToggleInclude}
              className={`flex items-center gap-1.5 px-4 h-9 rounded-full font-semibold text-label-md transition-colors ${
                cur.included
                  ? 'bg-primary text-on-primary'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Icon name={cur.included ? 'check_box' : 'check_box_outline_blank'} className="text-[18px]" />
              {cur.included ? '선택됨' : '선택하기'}
            </button>
          ) : null}
          {canEdit && !editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1 px-3 h-8 rounded-full bg-white/15 text-white text-label-sm hover:bg-white/25 transition-colors"
            >
              <Icon name="edit" className="text-[16px]" /> 수정
            </button>
          ) : null}
          {editMode ? (
            <button
              onClick={() => { setEditText(currentStory); setEditMode(false); }}
              className="flex items-center gap-1 px-3 h-8 rounded-full bg-white/15 text-white text-label-sm hover:bg-white/25 transition-colors"
            >
              취소
            </button>
          ) : null}
          <button onClick={onClose} className="p-2 hover:text-white" aria-label="닫기">
            <Icon name="close" className="text-[26px]" />
          </button>
        </div>
      </div>

      {/* 미디어 영역 */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0 px-2"
        onClick={(e) => e.stopPropagation()}
      >
        {i > 0 ? (
          <button onClick={prev} aria-label="이전"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <Icon name="chevron_left" className="text-[28px]" />
          </button>
        ) : null}

        {cur.type === 'video' ? (
          <video key={cur.id} src={cur.url} controls autoPlay className="max-h-full max-w-full rounded-lg bg-black" />
        ) : (
          <img key={cur.id} src={cur.url} className="max-h-full max-w-full object-contain rounded-lg" alt="" />
        )}

        {i < items.length - 1 ? (
          <button onClick={next} aria-label="다음"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <Icon name="chevron_right" className="text-[28px]" />
          </button>
        ) : null}
      </div>

      {/* 메모 편집 영역 (수정 모드) */}
      {editMode ? (
        <div className="shrink-0 px-4 pt-3 pb-1 space-y-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="이 순간을 어떻게 기억하고 싶은지 적어주세요."
            rows={3}
            className="w-full rounded-xl bg-white/10 text-white placeholder:text-white/40 text-body-md leading-relaxed px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 rounded-full bg-white text-black font-semibold text-label-sm disabled:opacity-50 hover:bg-white/90 transition-colors"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        (currentStory || (isMine && onSaveStory)) ? (
          <div className="shrink-0 px-4 py-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-white/90 text-body-md leading-relaxed whitespace-pre-line max-h-20 overflow-y-auto">
              {currentStory || <span className="text-white/40 italic">메모 없음</span>}
            </p>
          </div>
        ) : null
      )}

      {/* 하단 썸네일 스트립 + 추가 버튼 */}
      <div
        className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((m, idx) => (
          <div key={m.id} className="relative shrink-0">
            <button
              onClick={() => setI(idx)}
              className={`relative w-14 h-14 rounded-md overflow-hidden block ${
                idx === i ? 'ring-2 ring-white' : ''
              } ${
                onToggleInclude
                  ? (m.included ? (idx === i ? 'opacity-100' : 'opacity-70') : 'opacity-25')
                  : (idx === i ? 'opacity-100' : 'opacity-60')
              }`}
            >
              <img src={m.thumb_url ?? m.url} className="w-full h-full object-cover" alt="" />
              {m.type === 'video' ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Icon name="play_arrow" fill className="text-white text-[18px]" />
                </span>
              ) : null}
            </button>
            {/* 썸네일 X 삭제 버튼 (수정 모드일 때만) */}
            {editMode && onDeleteMedia ? (
              <button
                onClick={() => handleDeleteMedia(m.id)}
                disabled={deletingId === m.id}
                aria-label="사진 삭제"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 border border-white/30 text-white flex items-center justify-center hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {deletingId === m.id
                  ? <Icon name="hourglass_empty" className="text-[11px]" />
                  : <Icon name="close" className="text-[12px]" />}
              </button>
            ) : null}
          </div>
        ))}

        {/* + 추가 버튼 (수정 모드일 때만) */}
        {editMode && onAddMedia ? (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={adding}
              aria-label="사진 추가"
              className="shrink-0 w-14 h-14 rounded-md border-2 border-dashed border-white/30 text-white/60 flex items-center justify-center hover:border-white/60 hover:text-white/90 disabled:opacity-50 transition-colors"
            >
              {adding ? <Icon name="hourglass_empty" className="text-[20px]" /> : <Icon name="add" className="text-[24px]" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*"
              hidden
              onChange={(e) => e.target.files && handleAddMedia(e.target.files)}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
