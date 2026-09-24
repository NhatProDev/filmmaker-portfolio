# Production topology — recommendation (Phase 2G-A)

- **Status:** Recommendation for the owner's decision. **Nothing has been
  provisioned.** Phase 2G-B provisions and deploys, after approval.
- **Pricing:** every figure that decides cost must be **verified live** on the
  provider's pricing page at 2G-B. None is asserted here; this document compares
  pricing *models*, which change more slowly than prices.

## 1. What the application needs

Read from the code, not assumed:

| Need | From |
|---|---|
| Next.js 16 with a Node-runtime `proxy.ts`, ISR + `revalidatePath`, draft mode, route handlers | `src/proxy.ts`, `src/lib/cache/revalidate.ts`, preview routes |
| PostgreSQL (Drizzle, postgres.js); works behind a transaction pooler with `DATABASE_PREPARE=false` | `db/client.ts`, `server-env.ts` |
| S3-compatible object storage with **two buckets** (public behind a CDN, private for signed delivery) and **presigned PUT** for direct browser uploads | `src/lib/storage/*`, ADR-0014 |
| Case-sensitive filesystem: on a case-insensitive one a mixed-case `/works/COURT` can overwrite a prerendered page file | observed on Windows during Phase 2F verification |
| Small data: ~10 projects, ~60 MB of media to deploy today (`npm run media:manifest`) | manifest |
| Video: short muted loops (few MB) and CLICK_TO_PLAY films (the longest today is 8 min at 1280×720) | `src/content/projects.ts` |
| Admin traffic: one person | CLAUDE.md §11 |

## 2. Candidates

### Application hosting

| | Vercel | Railway | Render | Fly.io |
|---|---|---|---|---|
| Next 16 features (ISR, proxy, draft mode) | First-party | `next start` in a container: all features, cache on the instance's disk | Same as Railway | Same, plus multi-region machines |
| Static public pages | Served from the edge CDN | From the one instance (add a CDN in front for global latency) | Same | Same |
| Instances / cache coherence | Many; ISR cache is global and revalidation propagates | One instance: in-memory index and ISR cache coherent | One | One or more; per-machine caches |
| DB connections | Serverless: use a **pooled** URL, `DATABASE_PREPARE=false`, small `DATABASE_POOL_MAX` | Normal pool | Normal pool | Normal pool |
| Client IP | `x-real-ip` / `x-forwarded-for`, overwritten by the platform | `x-forwarded-for` from its proxy (verify hop count) | `x-forwarded-for` (verify) | `fly-client-ip` |
| Pricing model *(verify live)* | Plan per member; the free plan's terms exclude commercial use, which a working portfolio may be | Usage-based with a small plan fee | Instance-based | Machine usage-based |
| Ops burden | Lowest | Low | Low | Medium |

### PostgreSQL

| | Neon | Supabase Postgres | Railway Postgres |
|---|---|---|---|
| Fit | Serverless Postgres with a built-in pooler; scale-to-zero; branching for a restore rehearsal | Full Postgres, but brings auth/storage/APIs this app does not use | Simple, same platform as a Railway app |
| Backups / restore | Point-in-time restore window by plan *(verify)*; branches make restore tests cheap | Daily backups; PITR as an add-on *(verify)* | Volume backups *(verify)* |
| Cold start | A scaled-to-zero compute takes a moment to wake; the public pages are static, so only the Studio and first-render ISR feel it | None | None |

### Storage / CDN

| | Cloudflare R2 | S3 + CloudFront | Backblaze B2 + CDN |
|---|---|---|---|
| Egress | No egress fees *(verify)* — the decisive property for video | Paid egress (CloudFront) | Low egress, free to partner CDNs *(verify)* |
| Public delivery | Custom domain on the public bucket, cached by Cloudflare | CloudFront distribution | Via a CDN partner |
| Private delivery | SigV4 presigned GET on a private bucket (implemented) | Same | Same |
| Uploads | Presigned PUT; needs a CORS rule on the bucket for the site origin | Same | Same |

### Video

| | Plain MP4 through storage/CDN | Cloudflare Stream | Mux |
|---|---|---|---|
| What it gives | Progressive MP4 with byte ranges; exactly what the renderer plays today | Adaptive HLS, automatic renditions, player | Adaptive HLS, renditions, analytics |
| Fits the contract | Yes: posters, muted autoplay, `playsInline`, pause offscreen all work on `<video>` | Needs a new `VIDEO_PROVIDER` adapter and HLS playback | Same |
| When it is worth it | Now: loops are small, films are short and 720p | Long films, 4K masters, many mobile viewers on poor networks | Same, plus analytics |

## 3. Recommendation

**Vercel (app) + Neon (PostgreSQL) + Cloudflare R2 (media, two buckets, custom
domain for the public one) + plain MP4.**

- **Vercel** serves the static public pages from its edge network, which is
  what a media-first portfolio's first impression depends on, with no servers
  to run. Revalidation after Publish is global, and `src/proxy.ts` no longer
  depends on per-instance state for newly published projects
  (`project-router.ts`).
- **Neon** gives managed Postgres with a pooler (set `DATABASE_PREPARE=false`
  and a small pool), and branches make the restore drill in the runbook cheap.
  Put the Neon region next to the Vercel function region.
- **R2** has no egress charge for video, speaks the S3 API the storage adapter
  already signs (`MEDIA_STORAGE_PROVIDER=s3`), and a custom domain on the
  public bucket puts Cloudflare's cache in front of every public file.
- **Plain MP4** matches the current renderer and library. `VIDEO_PROVIDER` is
  reserved: revisit Stream or Mux only if films grow long or high-resolution.

**Runner-up:** Railway for the app (one long-running instance, everything
coherent in memory, usage pricing) with Railway Postgres or Neon. Choose it if
the Vercel plan terms or cost do not fit — the code needs no change, only
`TRUSTED_PROXY_HOPS` instead of `CLIENT_IP_HEADER`.

## 4. Decisions the owner still makes at 2G-B

1. Hosting plan and whether the portfolio counts as commercial use under it.
2. Regions for the app and the database (close to each other; the audience is
   international, the owner is in Hanoi).
3. The production domain (sets `SITE_URL`) and the media domain (sets
   `MEDIA_PUBLIC_BASE_URL`).
4. Neon's restore window / backup plan.
5. Whether About and Contact keep their own copies of four stills or point at
   the database assets (the manifest lists four byte-identical duplicates).
6. When to move PRIVATE-only media under `private/` (the manifest lists them;
   none exist today).

The exact provisioning sequence is §5 of `runbook.md`.

## 5. Owner decisions (2G-B, 2026-09-24)

| Decision | Chosen | Consequence |
|---|---|---|
| Vercel plan | Hobby | Terms limit Hobby to non-commercial use; a portfolio promoting paid work is likely commercial. Upgrading to Pro is a billing change, not a migration. |
| Neon plan | Free | 6-hour point-in-time restore window; the `pg_dump` backups in `runbook.md` §4 are the real recovery path. |
| Regions | Vercel `sin1` (`vercel.json`), Neon `aws-ap-southeast-1`, R2 location hint `apac` | App and database colocated in Singapore; visitors are served by the global CDNs. Neon's region is permanent. |
| Domain | None yet | `SITE_URL` is the `*.vercel.app` origin and public media use the bucket's rate-limited `r2.dev` URL until a domain on Cloudflare DNS exists. Both are build-time: changing them needs a rebuild. |

## 6. Production environment manifest (Vercel)

Set every variable for the **Production** environment only. A Preview
deployment given these values would publish and log in against the
production database. Secrets use Vercel's **Sensitive** type. Vercel exposes
Production variables to both the build and the functions. **B+R** means
read at build and at run time, so a change needs a redeploy. **R** means run
time only. Values that differ per deployment are in `.env.prod-ops`, never here.

| Variable | Value | Kind | When |
|---|---|---|---|
| `SITE_CONTENT_ADAPTER` | `db` | public | B+R |
| `SITE_URL` | the production origin, e.g. `https://<project>.vercel.app` | public | B+R |
| `DATABASE_URL` | Neon **pooled** host (`…-pooler…`), `?sslmode=verify-full`, no `channel_binding` | **secret** | B+R |
| `DATABASE_PREPARE` | `false` | public | B+R |
| `DATABASE_POOL_MAX` | `3` | public | B+R |
| `MEDIA_STORAGE_PROVIDER` | `s3` | public | B+R |
| `MEDIA_PUBLIC_BASE_URL` | the public bucket's `https://pub-….r2.dev` (later the media domain), no trailing slash | public | B+R |
| `S3_ENDPOINT` | `https://<account id>.r2.cloudflarestorage.com` | public | B+R |
| `S3_PUBLIC_BUCKET` | `portfolio-media-public` | public | B+R |
| `S3_PRIVATE_BUCKET` | `portfolio-media-private` | public | B+R |
| `S3_FORCE_PATH_STYLE` | `true` | public | B+R |
| `S3_REGION` | `auto` | public | R |
| `S3_ACCESS_KEY_ID` | R2 token, Object Read & Write on the two buckets | **secret** | R |
| `S3_SECRET_ACCESS_KEY` | R2 token secret | **secret** | R |
| `PROJECT_ACCESS_SECRET` | 48 random bytes, base64; generated for production only | **secret** | R |
| `CLIENT_IP_HEADER` | `x-real-ip` (Vercel overwrites it) | public | R |

Leave unset: `TRUSTED_PROXY_HOPS` (the header replaces it), `APP_ORIGINS`
(until a second host name exists), `MEDIA_PRIVATE_ROOT`,
`MEDIA_SIGNED_URL_TTL_SECONDS` (defaults to 300), `VIDEO_PROVIDER`, and every
`ADMIN_*` variable. Vercel sets `NODE_ENV=production` itself.

The build runs `next build` only. It never migrates: migrations run from
`.env.prod-ops` with `--confirm-remote` (`runbook.md` §1).
