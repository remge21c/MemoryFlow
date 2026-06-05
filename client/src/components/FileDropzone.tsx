import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';

function keyOf(f: File) {
  return `${f.name}_${f.size}_${f.lastModified}`;
}

/** 드래그앤드롭 + 다중 선택 업로더. 선택 파일 미리보기 + 개별 제거. */
export function FileDropzone({
  files,
  onChange,
  disabled,
  accept = 'image/*,video/*',
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : ''));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  function add(list: FileList | File[]) {
    const incoming = Array.from(list);
    const seen = new Set(files.map(keyOf));
    const merged = [...files];
    for (const f of incoming) {
      if (!seen.has(keyOf(f))) {
        merged.push(f);
        seen.add(keyOf(f));
      }
    }
    onChange(merged);
  }

  function remove(i: number) {
    onChange(files.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled && e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-7 text-center cursor-pointer transition-colors ${
          drag ? 'border-primary bg-primary/5' : 'border-outline/30 bg-surface-low hover:border-primary/40'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Icon name="cloud_upload" className="text-primary text-[30px]" />
        <p className="text-body-md text-on-surface font-medium">사진·영상을 끌어다 놓거나 눌러서 선택</p>
        <p className="text-label-sm text-outline">여러 장을 한 번에 올릴 수 있어요</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          hidden
          onChange={(e) => {
            if (e.target.files?.length) add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {files.length > 0 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {files.map((f, i) => (
            <div key={keyOf(f)} className="relative aspect-square rounded-md overflow-hidden bg-surface-container">
              {previews[i] ? (
                <img src={previews[i]} alt={f.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                  <Icon name="movie" className="text-[24px]" />
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                className="absolute top-0.5 right-0.5 bg-black/55 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
