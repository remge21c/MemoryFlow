// 전체화면 미디어 뷰어 — 보기 전용.
// 수정은 기록 페이지(ContributionEdit)로 일원화: editHref가 있으면 "수정" 버튼으로 이동만 시킨다.
// 관리자 스토리북 사진 선별(onToggleInclude)은 "보면서 고르는" 작업이라 뷰어에 유지.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MediaDTO } from '@memoryflow/shared';
import { Icon } from './ui';

export function MediaLightbox({
  items: initialItems,
  start,
  story,
  editHref,
  onSaveStory,
  onToggleInclude,
  onClose,
}: {
  items: MediaDTO[];
  start: number;
  story?: string;
  /** 사진 추가·삭제 등 전체 편집 페이지 경로 — "사진 편집" 링크로 노출 */
  editHref?: string;
  /** 있으면 라이트박스 안에서 스토리 글을 바로 편집·저장 (페이지 이동 없이) */
  onSaveStory?: (text: string) => Promise<void> | void;
  onToggleInclude?: (mediaId: number) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState(initialItems);
  const [i, setI] = useState(start);
  const touchX = useRef<number | null>(null);

  // 인라인 스토리 편집 상태
  const [editingStory, setEditingStory] = useState(false);
  const [draft, setDraft] = useState(story ?? '');
  const [savedStory, setSavedStory] = useState(story ?? '');
  const [savingStory, setSavingStory] = useState(false);
  // 다른 사진으로 넘어가는 등 story prop이 바뀌면 표시값 동기화 (편집 중이 아닐 때만)
  useEffect(() => {
    setSavedStory(story ?? '');
    setEditingStory(false);
    setDraft(story ?? '');
  }, [story]);

  async function handleSaveStory() {
    if (!onSaveStory) return;
    const text = draft.trim();
    setSavingStory(true);
    try {
      await onSaveStory(text);
      setSavedStory(text);
      setEditingStory(false);
    } finally {
      setSavingStory(false);
    }
  }

  const prev = useCallback(() => setI((v) => (v > 0 ? v - 1 : v)), []);
  const next = useCallback(() => setI((v) => (v < items.length - 1 ? v + 1 : v)), [items.length]);

  // 부모 컴포넌트의 데이터 변경 시 items 동기화
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // 사진 선별 토글 처리
  function handleToggleInclude() {
    const target = items[i];
    if (!onToggleInclude || !target) return;
    const mediaId = target.id;
    // 로컬 상태를 먼저 토글하여 즉각 피드백 제공
    setItems((prevItems) =>
      prevItems.map((m) => (m.id === mediaId ? { ...m, included: !m.included } : m))
    );
    onToggleInclude(mediaId);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
  }, [onClose, prev, next]);

  const cur = items[i];
  if (!cur) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={onClose}>
      {/* 상단 바 — 본문 폭에 맞춰 중앙 정렬 */}
      <div
        className="w-full max-w-3xl mx-auto flex items-center justify-between px-4 h-14 text-white/90 shrink-0"
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
          {onSaveStory && !editingStory ? (
            <button
              onClick={() => { setDraft(savedStory); setEditingStory(true); }}
              className="flex items-center gap-1 px-3 h-8 rounded-full bg-white/15 text-white text-label-sm hover:bg-white/25 transition-colors"
            >
              <Icon name="edit" className="text-[16px]" /> 수정
            </button>
          ) : null}
          {editHref ? (
            <Link
              to={editHref}
              className="flex items-center gap-1 px-3 h-8 rounded-full bg-white/10 text-white/80 text-label-sm hover:bg-white/20 transition-colors"
            >
              <Icon name="photo_library" className="text-[16px]" /> 사진 편집
            </Link>
          ) : null}
          <button onClick={onClose} className="p-2 hover:text-white" aria-label="닫기">
            <Icon name="close" className="text-[26px]" />
          </button>
        </div>
      </div>

      {/* 미디어 영역 (좌우 스와이프 지원) */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0 px-2"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
          touchX.current = null;
          if (dx > 50) prev();
          else if (dx < -50) next();
        }}
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

      {/* 스토리 — 본문 폭에 맞춰 중앙 정렬. 넉넉한 높이로 짧은 글은 스크롤 없이 전부 표시. onSaveStory 있으면 그 자리에서 편집 */}
      {(savedStory || editingStory) ? (
        <div className="w-full max-w-3xl mx-auto shrink-0 px-4 py-3 text-left" onClick={(e) => e.stopPropagation()}>
          {editingStory ? (
            <div>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="이 순간을 어떻게 기억하고 싶은지 적어주세요."
                className="w-full rounded-lg bg-white/10 text-white placeholder:text-white/40 text-body-lg leading-relaxed px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-white/40 max-h-[32dvh]"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleSaveStory}
                  disabled={savingStory}
                  className="px-4 h-9 rounded-full bg-primary text-on-primary font-semibold text-label-md disabled:opacity-50"
                >
                  {savingStory ? '저장 중…' : '저장'}
                </button>
                <button
                  onClick={() => { setEditingStory(false); setDraft(savedStory); }}
                  className="px-4 h-9 rounded-full bg-white/10 text-white text-label-md hover:bg-white/20"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-white/90 text-body-lg leading-relaxed whitespace-pre-line max-h-[32dvh] overflow-y-auto no-scrollbar">
              {savedStory}
            </p>
          )}
        </div>
      ) : null}

      {/* 하단 썸네일 스트립 — 본문 폭에 맞춰 중앙 정렬 */}
      <div
        className="w-full max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((m, idx) => (
          <button
            key={m.id}
            onClick={() => setI(idx)}
            className={`relative w-14 h-14 rounded-md overflow-hidden shrink-0 ${
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
        ))}
      </div>
    </div>
  );
}
