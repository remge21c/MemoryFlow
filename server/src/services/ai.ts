// AI 어댑터 (PRD 9장) — 동기 호출, 큐 없음, 30초 타임아웃.
// 미설정(AI_PROVIDER=stub)이면 로컬 스텁이 같은 인터페이스로 동작 → AI 없어도 편집/승인 가능.
import { env } from '../env.js';
import { targetChars } from '@memoryflow/shared';

export interface PerspectiveInput {
  name: string;
  text: string;
}

const TIMEOUT_MS = 30_000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('AI_TIMEOUT')), TIMEOUT_MS)),
  ]);
}

/** 여러 관점 → 한 단락 내레이션 초안. */
export async function mergeStories(
  perspectives: PerspectiveInput[],
  sceneSeconds: number,
  sceneTitle: string,
): Promise<string> {
  const filled = perspectives.filter((p) => p.text.trim().length > 0);
  const chars = targetChars(sceneSeconds);
  if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return withTimeout(anthropicMerge(filled, chars, sceneTitle));
  }
  if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return withTimeout(geminiMerge(filled, chars, sceneTitle));
  }
  return stubMerge(filled, chars);
}

/** 내레이션을 장면 길이에 맞게 요약. */
export async function summarizeToLength(text: string, sceneSeconds: number): Promise<string> {
  const chars = targetChars(sceneSeconds);
  if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
    return withTimeout(anthropicSummarize(text, chars));
  }
  if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return withTimeout(geminiSummarize(text, chars));
  }
  return stubSummarize(text, chars);
}

// ── 스텁 구현 (로컬, 결정적) ─────────────────────────────
function stubMerge(perspectives: PerspectiveInput[], chars: number): string {
  if (perspectives.length === 0) {
    return '이 장면에 대한 기록이 아직 없습니다. 사진을 보며 내레이션을 직접 작성해보세요.';
  }
  const sentences = perspectives
    .map((p) => p.text.trim().replace(/\s+/g, ' '))
    .map((t) => (/[.!?…]$/.test(t) ? t : `${t}.`));
  const merged = sentences.join(' ');
  // 장면 길이가 정해져 있고(>0) 합본이 가이드의 1.5배를 넘으면만 압축
  if (chars > 0 && merged.length > chars * 1.5) return stubSummarize(merged, chars);
  return merged;
}

function stubSummarize(text: string, chars: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (chars <= 0 || clean.length <= chars) return clean;
  // 문장 경계 기준으로 chars 안쪽까지 채움
  const parts = clean.split(/(?<=[.!?…])\s+/);
  let out = '';
  for (const s of parts) {
    if ((out + s).length > chars && out.length > 0) break;
    out += (out ? ' ' : '') + s;
  }
  if (!out) out = clean.slice(0, chars);
  return out.trim();
}

// ── Anthropic 구현 (선택) ────────────────────────────────
async function anthropicMerge(
  perspectives: PerspectiveInput[],
  chars: number,
  sceneTitle: string,
): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const body = perspectives.map((p) => `- ${p.name}: ${p.text}`).join('\n');
  const msg = await client.messages.create({
    model: env.AI_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content:
          `다음은 "${sceneTitle}" 장면에 대한 여러 사람의 한 줄 소감입니다. ` +
          `이를 따뜻하고 자연스러운 한 단락 내레이션으로 합쳐주세요. ` +
          `약 ${chars}자 내외, 영상 자막으로 읽기 좋게. 군더더기 없이 내레이션만 출력하세요.\n\n${body}`,
      },
    ],
  });
  return extractText(msg);
}

async function anthropicSummarize(text: string, chars: number): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: env.AI_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content:
          `다음 내레이션을 의미를 보존하면서 약 ${chars}자 이내로 자연스럽게 줄여주세요. ` +
          `내레이션만 출력하세요.\n\n${text}`,
      },
    ],
  });
  return extractText(msg);
}

function extractText(msg: { content: Array<{ type: string; text?: string }> }): string {
  return msg.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('')
    .trim();
}

// ── Gemini 구현 (가성비 모델 지원) ────────────────────────
async function geminiMerge(
  perspectives: PerspectiveInput[],
  chars: number,
  sceneTitle: string,
): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.AI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const body = perspectives.map((p) => `- ${p.name}: ${p.text}`).join('\n');
  const prompt = `다음은 "${sceneTitle}" 장면에 대한 여러 사람의 한 줄 소감입니다. ` +
    `이를 따뜻하고 자연스러운 한 단락 내레이션으로 합쳐주세요. ` +
    `약 ${chars}자 내외, 영상 자막으로 읽기 좋게. 군더더기 없이 내레이션만 출력하세요.\n\n${body}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 1024,
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
  }

  const resJson = await response.json() as any;
  const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Invalid response structure from Gemini API');
  }
  return text.trim();
}

async function geminiSummarize(text: string, chars: number): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.AI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const prompt = `다음 내레이션을 의미를 보존하면서 약 ${chars}자 이내로 자연스럽게 줄여주세요. ` +
    `내레이션만 출력하세요.\n\n${text}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 1024,
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
  }

  const resJson = await response.json() as any;
  const resText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) {
    throw new Error('Invalid response structure from Gemini API');
  }
  return resText.trim();
}
