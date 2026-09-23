import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Small cryptographic helpers shared by admin sessions and project access.

// An unguessable opaque token (256 bits).
export const randomToken = () => randomBytes(32).toString("base64url");

export const sha256Hex = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const hmac = (secret: string, payload: string) => createHmac("sha256", secret).update(payload, "utf8").digest("base64url");

// `payload.signature`. The payload must not contain a dot.
export function sign(secret: string, payload: string): string {
  return `${payload}.${hmac(secret, payload)}`;
}

// The payload when the signature is valid, otherwise null. Constant-time.
export function verifySigned(secret: string, value: string): string | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(hmac(secret, payload));
  return given.length === expected.length && timingSafeEqual(given, expected) ? payload : null;
}
