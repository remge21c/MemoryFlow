import crypto from 'node:crypto';
import { nanoid } from 'nanoid';

/** 공유/초대 토큰 원본 생성(URL-safe). 원본은 1회만 노출, DB엔 해시만. */
export function generateToken(): string {
  return nanoid(32);
}

export function sha256(input: string | Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** 토큰 원본 → 저장용 해시 (PRD 12장: token_hash만 저장) */
export function tokenHash(raw: string): string {
  return sha256(raw);
}

/** 파일 동일성 차단용 해시 (PRD 6장, 선택) */
export function fileHash(buf: Buffer): string {
  return sha256(buf);
}
