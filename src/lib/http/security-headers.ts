// Response security headers (CLAUDE.md §16), built from the environment at
// build time: next.config.ts bakes them into the route manifest, so every
// value here is read when `next build` runs. Deliberately free of other
// application imports, so the Next.js config can load it.
//
// - Scripts and styles allow 'unsafe-inline': the public pages are static, and
//   a nonce would force every page to render per request. Next.js inlines its
//   own bootstrap scripts, and the Project Detail title bootstrap is inline
//   (titlePlacement.ts). Nothing else is allowed to execute, and no
//   third-party script origin is listed.
// - Media and uploads may come from the configured storage/CDN origins only.
// - Frames: the only embeddable providers are the external video players the
//   contract names (ADR-0008 EXTERNAL_VIDEO, CLICK_TO_PLAY only). The site may
//   be framed only by itself — the Studio's responsive preview.
// - HSTS and upgrade-insecure-requests only for a production build whose
//   public origin is https, so a local `next start` on http keeps working.

export const EMBED_ORIGINS = ["https://www.youtube-nocookie.com", "https://www.youtube.com", "https://player.vimeo.com"];

export type SecurityHeaderOptions = {
  production: boolean;
  // SITE_URL; HSTS applies only when it is https.
  siteUrl?: string;
  // Origins media are delivered from or uploaded to, besides this site.
  mediaOrigins: string[];
};

type Env = Record<string, string | undefined>;

const originOf = (value: string | undefined): string | null => {
  if (!value || !/^https:\/\//.test(value)) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

// Every origin media can be served from or written to: the public media base
// (a CDN), and the S3-compatible endpoint that serves signed private
// deliveries and receives direct uploads, path-style or per bucket.
export function mediaOriginsFromEnv(env: Env): string[] {
  const origins = [originOf(env.MEDIA_PUBLIC_BASE_URL)];
  const endpoint = originOf(env.S3_ENDPOINT);
  if (endpoint && env.MEDIA_STORAGE_PROVIDER === "s3") {
    origins.push(endpoint);
    if (env.S3_FORCE_PATH_STYLE === "false") {
      const { protocol, host } = new URL(endpoint);
      for (const bucket of [env.S3_PUBLIC_BUCKET, env.S3_PRIVATE_BUCKET]) {
        if (bucket) origins.push(`${protocol}//${bucket}.${host}`);
      }
    }
  }
  return [...new Set(origins.filter((origin): origin is string => origin !== null))];
}

export function contentSecurityPolicy({ production, siteUrl, mediaOrigins }: SecurityHeaderOptions): string {
  const media = mediaOrigins.join(" ");
  const https = production && siteUrl?.startsWith("https://");
  const directives: [string, string][] = [
    ["default-src", "'self'"],
    // Development needs eval for fast refresh and its websocket.
    ["script-src", production ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'"],
    ["style-src", "'self' 'unsafe-inline'"],
    ["img-src", `'self' data: blob: ${media}`],
    ["media-src", `'self' blob: ${media}`],
    ["font-src", "'self' data:"],
    ["connect-src", production ? `'self' ${media}` : `'self' ws: ${media}`],
    ["frame-src", EMBED_ORIGINS.join(" ")],
    ["frame-ancestors", "'self'"],
    ["worker-src", "'self' blob:"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
  ];
  if (https) directives.push(["upgrade-insecure-requests", ""]);
  return directives.map(([name, value]) => `${name} ${value}`.trim().replace(/\s+/g, " ")).join("; ");
}

export function securityHeaders(options: SecurityHeaderOptions): { key: string; value: string }[] {
  const embeds = EMBED_ORIGINS.map((origin) => `"${origin}"`).join(" ");
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "browsing-topics=()",
        `autoplay=(self ${embeds})`,
        `fullscreen=(self ${embeds})`,
        `picture-in-picture=(self ${embeds})`,
      ].join(", "),
    },
  ];
  if (options.production && options.siteUrl?.startsWith("https://")) {
    // Two years, the preload list's minimum; preload itself is a separate,
    // deliberate submission and is not claimed here.
    headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  }
  return headers;
}

export function securityHeadersFromEnv(env: Env): { key: string; value: string }[] {
  return securityHeaders({
    production: env.NODE_ENV === "production",
    siteUrl: env.SITE_URL,
    mediaOrigins: mediaOriginsFromEnv(env),
  });
}
