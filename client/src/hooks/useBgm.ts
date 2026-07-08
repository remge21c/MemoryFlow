// 전역 BGM 컨트롤러(bgmController)를 구독하는 얇은 React 훅.
// 오디오 자체는 컴포넌트 밖에 있어, 페이지 이동에도 재생이 끊기지 않는다.
import { useSyncExternalStore } from 'react';
import { bgmController } from '../lib/bgmController';

export function useBgm() {
  const snap = useSyncExternalStore(bgmController.subscribe, bgmController.getSnapshot, bgmController.getSnapshot);
  return {
    playing: snap.playing,
    volume: snap.volume,
    error: snap.error,
    toggle: bgmController.toggle,
    setVolume: bgmController.setVolume,
  };
}
