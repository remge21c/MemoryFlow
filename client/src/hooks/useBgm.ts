// 프로젝트 배경음악(BGM) 재생 훅.
// 재생 on/off·볼륨을 localStorage에 저장하고 재접속 시 복원한다.
// 브라우저 자동재생 정책상 복원 시 재생 시도가 차단되면 정지 상태로 둔다(버튼으로 재생).
import { useEffect, useRef, useState } from 'react';

const ON_KEY = 'mf-bgm-on';
const VOL_KEY = 'mf-bgm-vol';

function readVol(): number {
  if (typeof window === 'undefined') return 0.7;
  const v = Number(localStorage.getItem(VOL_KEY));
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.7;
}

export function useBgm(url: string | null | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState<number>(readVol);

  // 오디오 준비 + 마지막 설정 복원
  useEffect(() => {
    if (!url) return;
    // 캐시 버스트 — 과거 잘못된 MIME(application/octet-stream) 응답이 캐시된 경우를 우회
    const src = `${url}${url.includes('?') ? '&' : '?'}v=2`;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = readVol();
    audioRef.current = audio;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    // 저장된 설정이 '켜짐'이면 재생 시도 (차단되면 정지 상태 유지)
    if (localStorage.getItem(ON_KEY) === '1') {
      audio.play().catch(() => {});
    }

    return () => {
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
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
      audio.play().then(() => localStorage.setItem(ON_KEY, '1')).catch(() => {});
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

  return { available: !!url, playing, toggle, volume, setVolume };
}
