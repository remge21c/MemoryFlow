// AI 어댑터 (PRD 9장) — 동기 호출, 큐 없음, 30초 타임아웃.
// 제공자: anthropic | gemini | lmstudio | stub.
// 1차 제공자(gemini 등) 호출이 실패하면 LM Studio(로컬, OpenAI 호환)로 자동 폴백한다.
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
  const prompt =
    `다음은 "${sceneTitle}" 장면에 대한 여러 사람의 한 줄 소감입니다. ` +
    `이를 따뜻하고 자연스러운 한 단락 내레이션으로 합쳐주세요. ` +
    `약 ${chars}자 내외, 영상 자막으로 읽기 좋게. 군더더기 없이 내레이션만 출력하세요.\n\n` +
    filled.map((p) => `- ${p.name}: ${p.text}`).join('\n');
  const out = await callAI(prompt);
  return out ?? stubMerge(filled, chars);
}

/** 내레이션을 장면 길이에 맞게 요약. */
export async function summarizeToLength(text: string, sceneSeconds: number): Promise<string> {
  const chars = targetChars(sceneSeconds);
  const prompt =
    `다음 내레이션을 의미를 보존하면서 약 ${chars}자 이내로 자연스럽게 줄여주세요. ` +
    `내레이션만 출력하세요.\n\n${text}`;
  const out = await callAI(prompt);
  return out ?? stubSummarize(text, chars);
}

/**
 * 설정된 제공자로 호출, 실패하면 LM Studio 폴백, 그것도 실패하면 throw.
 * 제공자가 stub(미설정)이면 null 반환 → 호출부에서 스텁 사용.
 */
async function callAI(prompt: string): Promise<string | null> {
  let primary: (() => Promise<string>) | null = null;
  if (env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) primary = () => anthropicGenerate(prompt);
  else if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) primary = () => geminiGenerate(prompt);
  else if (env.AI_PROVIDER === 'lmstudio') primary = () => lmstudioGenerate(prompt);
  if (!primary) return null;

  try {
    return await withTimeout(primary());
  } catch (e) {
    console.error(`[ai] ${env.AI_PROVIDER} 호출 실패:`, (e as Error).message);
    if (env.AI_PROVIDER !== 'lmstudio') {
      try {
        const out = await withTimeout(lmstudioGenerate(prompt));
        console.log('[ai] LM Studio 폴백 성공');
        return out;
      } catch (e2) {
        console.error('[ai] LM Studio 폴백도 실패:', (e2 as Error).message);
      }
    }
    throw e;
  }
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

// ── Anthropic ────────────────────────────────────────────
async function anthropicGenerate(prompt: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: env.AI_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content
    .filter((c) => c.type === 'text')
    .map((c) => ('text' in c ? c.text : ''))
    .join('')
    .trim();
}

// ── Gemini ───────────────────────────────────────────────
async function geminiGenerate(prompt: string): Promise<string> {
  const model = env.AI_MODEL || 'gemini-2.5-flash';
  // 키는 URL이 아니라 헤더로 전달 (로그/프록시 노출 방지)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini API Error: ${res.status} - ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Invalid response structure from Gemini API');
  return text.trim();
}

// ── LM Studio (OpenAI 호환 로컬 서버) ─────────────────────
let cachedLmModel: string | null = null;

async function lmstudioModel(): Promise<string> {
  if (env.LMSTUDIO_MODEL) return env.LMSTUDIO_MODEL;
  if (cachedLmModel) return cachedLmModel;
  const res = await fetch(`${env.LMSTUDIO_BASE_URL}/models`);
  if (!res.ok) throw new Error(`LM Studio 응답 없음 (${res.status}) — 서버가 켜져 있나요?`);
  const json = (await res.json()) as { data?: { id: string }[] };
  const id = json.data?.[0]?.id;
  if (!id) throw new Error('LM Studio에 로드된 모델이 없습니다');
  cachedLmModel = id;
  return id;
}

async function lmstudioGenerate(prompt: string): Promise<string> {
  const model = await lmstudioModel();
  const res = await fetch(`${env.LMSTUDIO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    cachedLmModel = null; // 모델 교체 등으로 무효해졌을 수 있음
    throw new Error(`LM Studio API Error: ${res.status} - ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('Invalid response structure from LM Studio');
  return text.trim();
}
