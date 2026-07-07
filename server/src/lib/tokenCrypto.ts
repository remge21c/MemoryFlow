// 초대/공유 링크 원문 토큰의 저장용 암호화 (AES-256-GCM).
// DB 유출 시 평문 토큰이 바로 재사용되지 않도록, 재열람 기능은 유지하되 저장은 암호문으로 한다.
// 키는 SESSION_SECRET에서 파생. (SESSION_SECRET 교체 시 기존 암호문은 복호화 불가 → 재열람만 상실,
//  링크 자체는 token_hash로 계속 동작)
import crypto from 'node:crypto';
import { env } from '../env.js';

const ALGO = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(env.SESSION_SECRET).digest(); // 32 bytes

/** 원문 → "iv.tag.ciphertext" (각 base64url) */
export function encryptToken(raw: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ct = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.');
}

/** 복호화. 형식 오류·인증 실패 시 null. */
export function decryptToken(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    const [ivB, tagB, ctB] = enc.split('.');
    if (!ivB || !tagB || !ctB) return null;
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivB, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
    const pt = Buffer.concat([decipher.update(Buffer.from(ctB, 'base64url')), decipher.final()]);
    return pt.toString('utf8');
  } catch {
    return null;
  }
}
