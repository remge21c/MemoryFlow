// 앱 전역 배경음악 컨트롤러 — 페이지 이동과 무관하게 단일 오디오가 끊김 없이 이어진다.
// 오디오 엘리먼트를 React 컴포넌트 밖(모듈 전역)에 두어 라우트 전환 시 언마운트되지 않게 한다.
// 재생 on/off·볼륨은 localStorage에 저장하고 복원. 자동재생 차단은 조용히 무시(버튼으로 재생).

const ON_KEY = 'mf-bgm-on';
const VOL_KEY = 'mf-bgm-vol';

function readVol(): number {
  if (typeof window === 'undefined') return 0.7;
  const v = Number(localStorage.getItem(VOL_KEY));
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.7;
}

function mediaErrorMessage(audio: HTMLAudioElement): string {
  switch (audio.error?.code) {
    case 2: return '네트워크 오류로 음악을 불러오지 못했습니다.';
    case 3: return '음원 디코딩에 실패했습니다(파일 손상 가능).';
    case 4: return '브라우저가 음원 형식을 인식하지 못했습니다(서버 응답 형식 확인 필요).';
    default: return '음악을 재생할 수 없습니다.';
  }
}

function cacheBusted(url: string): string {
  // 과거 잘못된 MIME 응답이 캐시된 경우 우회
  return `${url}${url.includes('?') ? '&' : '?'}v=2`;
}

export interface BgmSnapshot {
  playing: boolean;
  volume: number;
  error: string | null;
  url: string | null;
}

let audio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let error: string | null = null;
const listeners = new Set<() => void>();

let snapshot: BgmSnapshot = { playing: false, volume: readVol(), error: null, url: null };

function compute(): BgmSnapshot {
  return {
    playing: !!audio && !audio.paused && !audio.ended,
    volume: audio ? audio.volume : readVol(),
    error,
    url: currentUrl,
  };
}

function emit(): void {
  snapshot = compute(); // useSyncExternalStore용 안정적 참조 (변경 시에만 새 객체)
  for (const l of listeners) l();
}

function ensure(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.loop = true;
  a.volume = readVol();
  a.addEventListener('play', () => { error = null; emit(); });
  a.addEventListener('pause', emit);
  a.addEventListener('ended', emit);
  a.addEventListener('error', () => { error = mediaErrorMessage(a); emit(); });
  audio = a;
  return a;
}

export const bgmController = {
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },

  getSnapshot(): BgmSnapshot {
    return snapshot;
  },

  /**
   * 현재 프로젝트의 BGM url 지정.
   * - 같은 url이면 아무것도 안 함(재생 유지, 끊기지 않음).
   * - 새 url이면 교체 후 저장 설정이 '켜짐'이면 재생 시도.
   * - null이면 정지(현재 프로젝트에 BGM이 없다는 뜻).
   * 이 함수는 ProjectHome에서만 호출 → 다른 페이지로 이동해도 재생이 지속된다.
   */
  setSource(url: string | null | undefined): void {
    const next = url ?? null;
    if (next === currentUrl) return;
    const a = ensure();
    currentUrl = next;
    error = null;
    if (!next) {
      a.pause();
      a.removeAttribute('src');
      a.load();
      emit();
      return;
    }
    a.src = cacheBusted(next);
    a.load();
    if (localStorage.getItem(ON_KEY) === '1') {
      a.play().catch(() => {}); // 자동재생 차단은 조용히
    }
    emit();
  },

  toggle(): void {
    if (!currentUrl) return;
    const a = ensure();
    if (a.paused) {
      a.play()
        .then(() => localStorage.setItem(ON_KEY, '1'))
        .catch((e: unknown) => {
          error = a.error ? mediaErrorMessage(a) : `재생 실패: ${(e as Error)?.message ?? '알 수 없는 오류'}`;
          emit();
        });
    } else {
      a.pause();
      localStorage.setItem(ON_KEY, '0');
    }
  },

  setVolume(v: number): void {
    const nv = Math.min(1, Math.max(0, v));
    ensure().volume = nv;
    localStorage.setItem(VOL_KEY, String(nv));
    emit();
  },
};
