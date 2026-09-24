# Environment contract

Validated by `src/lib/env/server-env.ts` on first use; an invalid value fails
loudly, never silently falls back. `npm run env:check` prints what is set
(never secret values) and validates; `npm run env:check -- --production` also
refuses anything a public deployment lacks (`productionIssues`).

No secret is ever committed (`.gitignore` excludes `.env*` except
`.env.example`). No variable here is exposed to the browser: none has the
`NEXT_PUBLIC_` prefix.

## Build time versus run time

The public pages are prerendered, and `next.config.ts` bakes response headers
into the build. So some variables must be present **when `next build` runs**,
and changing them needs a rebuild:

| When read | Variables |
|---|---|
| **Build** (and run) | `SITE_CONTENT_ADAPTER`, `DATABASE_URL` (db adapter: pages prerender from the database), `SITE_URL` (canonical, Open Graph, sitemap), `MEDIA_PUBLIC_BASE_URL` (media URLs in prerendered HTML), and for the CSP: `MEDIA_STORAGE_PROVIDER`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_BUCKET`, `S3_PRIVATE_BUCKET` |
| **Run** only | `PROJECT_ACCESS_SECRET`, `APP_ORIGINS`, `CLIENT_IP_HEADER`, `TRUSTED_PROXY_HOPS`, `MEDIA_PRIVATE_ROOT`, `MEDIA_SIGNED_URL_TTL_SECONDS`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `DATABASE_POOL_MAX`, `DATABASE_PREPARE` |
| **Scripts** only | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` (`db:seed-admin`) |

On a platform with separate build and runtime environments (Vercel), set the
build-time variables for both.

## Variables

| Variable | Default | Production | Purpose |
|---|---|---|---|
| `SITE_CONTENT_ADAPTER` | `static` | `db` | Where public content comes from. |
| `DATABASE_URL` | — | required | `postgres://…`. Behind a transaction pooler (Neon's pooled URL) also set `DATABASE_PREPARE=false`. |
| `DATABASE_POOL_MAX` | 10 | 1–5 on serverless | Connections per instance. |
| `DATABASE_PREPARE` | `true` | `false` behind a pooler | Named prepared statements. |
| `SITE_URL` | `http://localhost:3000` (fallback) | required, https | Bare public origin. Enables HSTS and `upgrade-insecure-requests` in production. Also accepted by the CSRF origin check. |
| `APP_ORIGINS` | — | optional | Extra accepted origins (a second host name). |
| `PROJECT_ACCESS_SECRET` | — | required, 32+ chars | Signs private-project access cookies (CLAUDE.md §11). Rotating it signs every visitor out of every private project. |
| `CLIENT_IP_HEADER` | — | one of these two | A header the platform **always overwrites** with the client address: `x-real-ip` (Vercel), `cf-connecting-ip` (behind Cloudflare), `fly-client-ip` (Fly.io). |
| `TRUSTED_PROXY_HOPS` | 0 | one of these two | Number of reverse proxies that append to `X-Forwarded-For`. The client is the N-th entry from the right. With 0 and no header, forwarded headers are ignored and every visitor shares one rate-limit address. |
| `MEDIA_STORAGE_PROVIDER` | `local` | `s3` | `local`: public keys from `public/media`, private keys from `MEDIA_PRIVATE_ROOT`, no uploads. `s3`: any S3-compatible store. |
| `MEDIA_PUBLIC_BASE_URL` | `/media` | CDN https origin (+ optional path) | Where public keys are served. |
| `MEDIA_PRIVATE_ROOT` | `storage/private` | unused with `s3` | Local private objects, outside `public/`, gitignored. |
| `MEDIA_SIGNED_URL_TTL_SECONDS` | 300 | 60–300 | Lifetime of a signed private delivery or upload URL. |
| `S3_ENDPOINT` | — | required with `s3` | e.g. `https://<account>.r2.cloudflarestorage.com`. |
| `S3_REGION` | `auto` | `auto` for R2 | SigV4 region. |
| `S3_PUBLIC_BUCKET` / `S3_PRIVATE_BUCKET` | — | required with `s3`, distinct | Public bucket behind the CDN; private bucket never public. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — | required with `s3` | A token scoped to the two buckets only. |
| `S3_FORCE_PATH_STYLE` | `true` | `true` for R2 | Path-style URLs (`endpoint/bucket/key`). |
| `VIDEO_PROVIDER` | `none` | `none` | Reserved for Mux / Cloudflare Stream; any other value is refused until implemented. |

## Secrets handling

- Generate secrets with a CSPRNG, e.g.
  `node -e "console.log(require('crypto').randomBytes(36).toString('base64'))"`.
- Keep production secrets only in the hosting platform's encrypted environment.
- `ADMIN_PASSWORD` is used once by `db:seed-admin` and should not stay in any
  environment afterwards.
