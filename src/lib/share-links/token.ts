import { createHash, randomBytes } from "node:crypto";

export const SHARE_LINK_EXPIRY_DAYS = [30, 60, 120, 180, 360] as const;

export type ShareLinkExpiryDays = (typeof SHARE_LINK_EXPIRY_DAYS)[number];

export function createShareToken() {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isShareLinkExpiryDays(value: number): value is ShareLinkExpiryDays {
  return SHARE_LINK_EXPIRY_DAYS.includes(value as ShareLinkExpiryDays);
}

export function expiresAtForDays(days: ShareLinkExpiryDays) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

