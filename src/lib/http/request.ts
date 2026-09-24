import { isIP } from "node:net";
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

// Which forwarded headers are trustworthy is a property of the deployment, not
// of the request: a header a client can set is only as good as the proxy that
// overwrites it (CLIENT_IP_HEADER, TRUSTED_PROXY_HOPS in server-env.ts).
export type ProxyPolicy = {
  // A header the hosting platform always sets itself, e.g. x-real-ip.
  header?: string;
  // How many reverse proxies append to X-Forwarded-For in front of the app.
  hops: number;
};

export function proxyPolicy(): ProxyPolicy {
  const env = serverEnv();
  return { header: env.CLIENT_IP_HEADER, hops: env.TRUSTED_PROXY_HOPS };
}

const behindTrustedProxy = (policy: ProxyPolicy) => Boolean(policy.header) || policy.hops > 0;

// An address as a proxy wrote it: bare, bracketed IPv6, or with a port.
function normalizeAddress(value: string | undefined): string | null {
  if (!value) return null;
  let address = value.trim();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(address);
  if (bracketed) address = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(address)) address = address.slice(0, address.lastIndexOf(":"));
  return isIP(address) ? address.toLowerCase() : null;
}

// The client's address for rate limiting. Behind no configured proxy,
// forwarded headers are client-controlled and ignored, so every request
// counts as "unknown" (local development, or a misconfigured deployment —
// `npm run env:check -- --production` refuses the latter). Each trusted proxy
// appends the address it received the request from, so with N of them the
// client is the N-th entry from the right; anything left of it was supplied
// by the client and is never read.
export function resolveClientAddress(headers: Headers, policy: ProxyPolicy): string {
  let candidate: string | undefined;
  if (policy.header) {
    candidate = headers.get(policy.header)?.split(",")[0];
  } else if (policy.hops > 0) {
    const chain = (headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    candidate = chain.length >= policy.hops ? chain[chain.length - policy.hops] : undefined;
  }
  return normalizeAddress(candidate) ?? "unknown";
}

export function clientAddress(request: Request): string {
  return resolveClientAddress(request.headers, proxyPolicy());
}

// The origin a browser would send for a same-origin request to this server.
// Forwarded host and protocol are read only from a trusted proxy.
export function ownOrigins(request: Request, policy: ProxyPolicy = proxyPolicy()): string[] {
  const url = new URL(request.url);
  const trusted = behindTrustedProxy(policy);
  const host = (trusted ? request.headers.get("x-forwarded-host") : null) ?? request.headers.get("host") ?? url.host;
  const proto = (trusted ? request.headers.get("x-forwarded-proto") : null) ?? url.protocol.replace(":", "");
  const { APP_ORIGINS, SITE_URL } = serverEnv();
  return [...new Set([`${proto}://${host}`, url.origin, ...(SITE_URL ? [SITE_URL] : []), ...APP_ORIGINS])];
}

// CSRF defence for state-changing requests (CLAUDE.md §16): the browser's
// Origin header must name this site. Without an Origin, only a request the
// browser itself labels same-origin is accepted.
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) return ownOrigins(request).includes(origin);
  return request.headers.get("sec-fetch-site") === "same-origin";
}
