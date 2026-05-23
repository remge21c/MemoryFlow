import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export type SessionClaims = {
  userId: string;
  email: string;
  globalRole?: "super_admin";
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }

  return encoder.encode(secret);
}

export async function createSessionToken(claims: SessionClaims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify<SessionClaims>(token, getSessionSecret());
  return payload;
}
