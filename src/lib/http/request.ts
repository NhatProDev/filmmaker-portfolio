import { serverEnv } from "@/lib/env/server-env";

// Reading the parts of an HTTP request the security boundary depends on:
// cookies, the client's address and the request's origin.

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export type CookieOptions = {
  maxAgeSeconds: number;
  sameSite: "Strict" | "Lax";
  path?: string;
};

// HttpOnly always; Secure in production (browsers accept Secure cookies on
// http://localhost, so local production builds work too).
export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? "/"}`,
    `Max-Age=${options.maxAgeSeconds}`,
    "HttpOnly",
    `SameSite=${options.sameSite}`,
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

export const expireCookie = (name: string, sameSite: CookieOptions["sameSite"], path = "/") =>
  serializeCookie(name, "", { maxAgeSeconds: 0, sameSite, path });

// The client's address for rate limiting: the first X-Forwarded-For hop set by
// the hosting proxy, else X-Real-IP. Behind no proxy these headers are client
// controlled, which is why every limit also has a per-subject key.
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return address.slice(0, 100);
}

// The origin a browser would send for a same-origin request to this server.
function ownOrigins(request: Request): string[] {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return [...new Set([`${proto}://${host}`, url.origin, ...serverEnv().APP_ORIGINS])];
}

// CSRF defence for state-changing requests (CLAUDE.md §16): the browser's
// Origin header must name this site. Without an Origin, only a request the
// browser itself labels same-origin is accepted.
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) return ownOrigins(request).includes(origin);
  return request.headers.get("sec-fetch-site") === "same-origin";
}
