// 영상 길이 모델 (PRD 8장) — client/server 공유 순수 함수.
//
// 한 장면 길이 = Σ(included photo × photo_seconds) + Σ(included video duration)
// 적정 내레이션 글자수 = scene_seconds 기반 제안값 (강제 아님).

/** 읽기 속도: 약 분당 ~312자 → 초당 5.2자 (목업 23초≈120자와 정합) */
export const CHARS_PER_SECOND = 5.2;

export interface SceneMediaItem {
  type: 'photo' | 'video';
  included: boolean;
  duration_seconds?: number | null; // video만
}

/** 장면 길이(초) 계산. photoSeconds = schedule.photo_seconds ?? project.default_photo_seconds */
export function computeSceneSeconds(items: SceneMediaItem[], photoSeconds: number): number {
  let total = 0;
  for (const m of items) {
    if (!m.included) continue;
    if (m.type === 'photo') {
      total += photoSeconds;
    } else {
      total += Number(m.duration_seconds ?? 0);
    }
  }
  return Math.round(total * 100) / 100;
}

/** 장면 길이에 맞는 적정 내레이션 글자수(제안값). */
export function targetChars(sceneSeconds: number): number {
  return Math.round(sceneSeconds * CHARS_PER_SECOND);
}

export interface SceneLength {
  scene_seconds: number;
  target_chars: number;
}

export function sceneLength(items: SceneMediaItem[], photoSeconds: number): SceneLength {
  const scene_seconds = computeSceneSeconds(items, photoSeconds);
  return { scene_seconds, target_chars: targetChars(scene_seconds) };
}

/** 초 → "M분 S초" 표시 */
export function formatSeconds(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}분` : `${m}분 ${r}초`;
}
