// 프로젝트 배경음악(BGM) 재생 훅.
// 재생 on/off·볼륨을 localStorage에 저장하고 재접속 시 복원한다.
// 브라우저 자동재생 정책상 복원 시 재생 시도가 차단되면 정지 상태로 둔다(버튼으로 재생).
// 재생 실패는 조용히 삼키지 않고 error 메시지로 노출한다(원인 진단 가능하게).
import { useEffect, useRef, useState } from 'react';

const ON_KEY = 'mf-bgm-on';
const VOL_KEY = 'mf-bgm-vol';

function readVol(): number {
  if (typeof window === 'undefined') return 0.7;
  const v = Number(localStorage.getItem(VOL_KEY));
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.7;
}

/** MediaError 코드 → 사용자용 메시지 (code 4 = 형식/응답 문제 → 서버 MIME 미배포 신호) */
function mediaErrorMessage(audio: HTMLAudioElement): string {
  const code = audio.error?.code;
  switch (code) {
    case 2: return '네트워크 오류로 음악을 불러오지 못했습니다.';
    case 3: return '음원 디코딩에 실패했습니다(파일 손상 가능).';
    case 4: return '브라우저가 음원 형식을 인식하지 못했습니다(서버 응답 형식 확인 필요).';
    default: return '음악을 재생할 수 없습니다.';
  }
}

export function useBgm(url: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState<number>(readVol);
  const [error, setError] = useState<string | null>(null);

  // 오디오 준비 + 마지막 설정 복원
  useEffect(() => {
    if (!url) return;
    setError(null);
    // 캐시 버스트 — 과거 잘못된 MIME(application/octet-stream) 응답이 캐시된 경우를 우회
    const src = `${url}${url.includes('?') ? '&' : '?'}v=2`;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = readVol();
    audioRef.current = audio;

    const onPlay = () => { setPlaying(true); setError(null); };
    const onPause = () => setPlaying(false);
    const onError = () => setError(mediaErrorMessage(audio));
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    // 저장된 설정이 '켜짐'이면 재생 시도 (자동재생 차단은 정상 동작이라 에러 표시 안 함)
    if (localStorage.getItem(ON_KEY) === '1') {
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.src = '';
      audioRef.current = null;
      setPlaying(false);
    };
  }, [url]);

  // 볼륨 반영
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => localStorage.setItem(ON_KEY, '1'))
        .catch((e: unknown) => {
          // 사용자가 직접 누른 재생이 실패하면 원인을 표시
          setError(audio.error ? mediaErrorMessage(audio) : `재생 실패: ${(e as Error)?.message ?? '알 수 없는 오류'}`);
        });
    } else {
      audio.pause();
      localStorage.setItem(ON_KEY, '0');
    }
  }

  function setVolume(v: number) {
    const nv = Math.min(1, Math.max(0, v));
    setVolumeState(nv);
    localStorage.setItem(VOL_KEY, String(nv));
  }

  return { available: !!url, playing, toggle, volume, setVolume, error };
}
