// 영상 길이 모델 (PRD 8장) — client/server 공유 순수 함수.
//
// 한 장면 길이 = Σ(included photo × photo_seconds) + Σ(included video duration)
// 적정 내레이션 글자수 = scene_seconds 기반 제안값 (강제 아님).

// 자막 읽기 속도(초당 글자수). 넷플릭스 한국어 자막 기준: 성인 12자/초, 아동 9자/초.
// 청소년~가족 전 연령이 편안히 읽을 수 있는 값으로 10자/초 채택(사진 3초 ≈ 30자).
export const CHARS_PER_SECOND = 10;

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

/**
 * 가독 단위 글자수 — 한글/CJK/전각 문자는 1, 라틴문자·숫자·공백·문장부호는 0.5로 센다.
 * (넷플릭스 한국어 자막 기준: 한글 1, 라틴/공백/문장부호 0.5. 영어가 한글보다 빨리 읽히는 점 반영)
 */
export function weightedLength(text: string): number {
  let sum = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    const isFullWidthScript =
      (c >= 0xac00 && c <= 0xd7a3) || // 한글 음절
      (c >= 0x1100 && c <= 0x11ff) || // 한글 자모
      (c >= 0x3130 && c <= 0x318f) || // 한글 호환 자모
      (c >= 0x4e00 && c <= 0x9fff) || // CJK 한자
      (c >= 0x3040 && c <= 0x30ff) || // 히라가나·가타카나
      (c >= 0xff00 && c <= 0xffef); // 전각
    sum += isFullWidthScript ? 1 : 0.5;
  }
  return Math.round(sum);
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
