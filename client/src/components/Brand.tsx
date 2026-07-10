// MemoryFlow 브랜드 로고 — 조리개(셔터) 마크 + 워드마크.
// 스퀘어는 디자인 시스템 틸 토큰(tertiary-container), 워드마크는 on-surface(뉴트럴)로
// 앱의 웜 팔레트/토큰 체계에 정렬. 조리개 컬러가 브랜드 포인트.

/** 아이콘만 (라운드 틸 스퀘어 안의 컬러 조리개). className으로 크기 지정. */
export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="MemoryFlow">
      <rect x="6" y="6" width="88" height="88" rx="24" fill="#00818a" />
      <circle cx="50" cy="50" r="37" fill="#fdfdfb" />
      {/* 조리개 날개 (스월형) */}
      <path fill="#1f8f80" d="M84.00 50.00 A34 34 0 0 1 67.00 79.44 L51.15 60.94 L60.05 54.47 Z" />
      <path fill="#33a35c" d="M67.00 79.44 A34 34 0 0 1 33.00 79.44 L41.10 56.47 L51.15 60.94 Z" />
      <path fill="#8ec63f" d="M33.00 79.44 A34 34 0 0 1 16.00 50.00 L39.95 45.53 L41.10 56.47 Z" />
      <path fill="#e6b23a" d="M16.00 50.00 A34 34 0 0 1 33.00 20.56 L48.85 39.06 L39.95 45.53 Z" />
      <path fill="#e37b3c" d="M33.00 20.56 A34 34 0 0 1 67.00 20.56 L58.90 43.53 L48.85 39.06 Z" />
      <path fill="#2fa39a" d="M67.00 20.56 A34 34 0 0 1 84.00 50.00 L60.05 54.47 L58.90 43.53 Z" />
    </svg>
  );
}

/** 마크 + "Memory Flow" 워드마크. */
export function Brand({
  markClassName = 'w-7 h-7',
  textClassName = 'text-title-sm',
  className = '',
}: {
  markClassName?: string;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className={markClassName} />
      <span className={`font-bold tracking-tight text-on-surface whitespace-nowrap ${textClassName}`}>
        MemoryFlow
      </span>
    </span>
  );
}
