// 공용 미디어 캐러셀 — scroll-snap 기반 네이티브 스와이프.
// 여러 장이면 다음 장 가장자리가 살짝 보여(peek) 추가 사진이 있음을 시각적으로 알린다.
import { useRef, useState } from 'react';
import type { MediaDTO } from '@memoryflow/shared';
import { Icon } from './ui';

export function MediaCarousel({
  media,
  onItemClick,
  onDelete,
  deletingId,
  onTrimVideo,
  fit = 'cover',
}: {
  media: MediaDTO[];
  /** 슬라이드 탭 시 (라이트박스 열기 등). 없으면 단순 표시. */
  onItemClick?: (index: number) => void;
  /** 현재 슬라이드 삭제 버튼 (편집 화면용). */
  onDelete?: (mediaId: number) => void;
  deletingId?: number | null;
  /** 현재 슬라이드가 영상일 때 자르기 버튼 (편집 화면용). */
  onTrimVideo?: (media: MediaDTO) => void;
  /** 'cover': 프레임 채움(잘림). 'contain': 사진 전체 표시(단일은 원본 비율, 다중은 레터박스). */
  fit?: 'cover' | 'contain';
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const multi = media.length > 1;

  if (media.length === 0) return null;

  // 스크롤 위치에서 중앙에 가장 가까운 슬라이드 → 현재 인덱스
  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((ch, i) => {
      const c = ch as HTMLElement;
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setIdx(best);
  }

  function scrollToSlide(i: number) {
    const el = trackRef.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
  }

  const cur = media[Math.min(idx, media.length - 1)]!;

  return (
    <div className="relative">
      {/* 슬라이드 트랙 */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-xl"
      >
        {media.map((m, i) => {
          // 단일 사진 + contain: 고정 프레임 없이 원본 비율로 전체 표시. 그 외: 4:3 프레임.
          const naturalFrame = fit === 'contain' && !multi;
          const imgClass = fit === 'contain'
            ? naturalFrame
              ? 'w-full h-auto max-h-[80vh] object-contain'
              : 'w-full h-full object-contain'
            : 'w-full h-full object-cover';
          const inner = (
            <>
              <img src={m.thumb_url ?? m.url} loading="lazy" className={imgClass} alt="" />
              {m.type === 'video' ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Icon name="play_circle" fill className="text-white text-[40px]" />
                </span>
              ) : null}
              {m.type === 'video' && m.duration_seconds ? (
                <span className="absolute bottom-2 left-2 bg-black/55 text-white text-[11px] px-1.5 py-0.5 rounded">
                  {Math.round(m.duration_seconds)}s
                </span>
              ) : null}
            </>
          );
          // 왼쪽 붙임 정렬 — 첫 장은 단일 사진처럼 좌측에 딱 붙고, 다음 장이 오른쪽에 살짝 보임
          // 단일 사진 + contain은 원본 비율을 위해 고정 4:3 프레임을 생략한다.
          const slideClass = `relative shrink-0 snap-start overflow-hidden rounded-xl bg-surface-container ${
            naturalFrame ? '' : 'aspect-[4/3]'
          } ${multi ? 'w-[86%]' : 'w-full'}`;
          return onItemClick ? (
            <button key={m.id} className={slideClass} onClick={() => onItemClick(i)} aria-label={`${i + 1}번째 미디어 전체화면으로 보기`}>
              {inner}
            </button>
          ) : (
            <div key={m.id} className={slideClass}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* 현재 슬라이드 액션 (편집용): 영상 자르기 / 삭제 */}
      {onTrimVideo || onDelete ? (
        <div className="absolute top-2 right-2 z-10 flex gap-1.5">
          {onTrimVideo && cur.type === 'video' ? (
            <button
              onClick={() => onTrimVideo(cur)}
              aria-label="영상 자르기"
              title="영상 자르기"
              className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <Icon name="content_cut" className="text-[16px]" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              onClick={() => onDelete(cur.id)}
              disabled={deletingId === cur.id}
              aria-label="이 사진 삭제"
              className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 disabled:opacity-50 transition-colors"
            >
              <Icon name={deletingId === cur.id ? 'hourglass_empty' : 'close'} className="text-[18px]" />
            </button>
          ) : null}
        </div>
      ) : null}

      {/* 데스크톱용 이전/다음 버튼 */}
      {multi && idx > 0 ? (
        <button
          onClick={() => scrollToSlide(idx - 1)}
          aria-label="이전 사진"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white hidden md:flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Icon name="chevron_left" className="text-[22px]" />
        </button>
      ) : null}
      {multi && idx < media.length - 1 ? (
        <button
          onClick={() => scrollToSlide(idx + 1)}
          aria-label="다음 사진"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white hidden md:flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Icon name="chevron_right" className="text-[22px]" />
        </button>
      ) : null}

      {/* 장수 표시 + 점 인디케이터 (여러 장이면 항상 표시) */}
      {multi ? (
        <>
          <span className="absolute top-2 left-2 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full pointer-events-none">
            {idx + 1} / {media.length}
          </span>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToSlide(i)}
                aria-label={`${i + 1}번째 사진으로 이동`}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
