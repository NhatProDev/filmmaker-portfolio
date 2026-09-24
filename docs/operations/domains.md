# Domains — site and media (pending owner approval)

Production today runs on two provider host names (`deployment.md` §5):

- site: `https://filmmaker-portfolio-beta.vercel.app`
- public media: the public bucket's `https://pub-….r2.dev` URL

`r2.dev` is rate-limited and not meant for production traffic. Both moves
below change DNS, so each waits for the owner to choose the domain and approve
the change. Nothing in this file has been applied.

Why the moves are cheap: the database and every published snapshot store
media **keys**, never URLs. URLs are derived at render time from
`MEDIA_PUBLIC_BASE_URL`, and the CSP's media origins and HSTS derive from the
environment (`src/lib/http/security-headers.ts`). Both variables are read at
build time, so each move is **env change → redeploy**, with no data migration.

## Prerequisite

The domain's DNS must be on Cloudflare for an R2 custom domain. It can be
registered anywhere; the nameservers point at Cloudflare. Adding a zone on the
Free plan costs nothing. Buying a domain does cost money, so the owner does
that.

## A. Media: `r2.dev` → `media.<domain>`

Do A before or together with B. A only needs the zone on Cloudflare.

1. In the Cloudflare dashboard, go to **R2 → portfolio-media-public →
   Settings → Custom Domains → Connect Domain** and enter `media.<domain>`.
   Cloudflare creates the DNS record and the certificate. Wait until the
   status reads **Active**.
2. Check it before switching. The two URLs must return byte-identical content
   for the same key:
   ```text
   K=home/n1.mp4
   curl -s https://pub-….r2.dev/$K | sha256sum
   curl -s https://media.<domain>/$K | sha256sum
   curl -sI -H "Range: bytes=0-99" https://media.<domain>/$K    # 206
   curl -s  https://media.<domain>/private/anything              # 404
   ```
   The private bucket keeps no public domain. It is only ever reached through
   presigned URLs on the S3 endpoint.
3. CORS belongs to the bucket, not the host name, so it carries over. After
   the site domain exists (B), add `https://<domain>` as an allowed origin on
   **both** buckets, with the same rule as now: `GET`, `HEAD` and `PUT`, the
   header `content-type`, and exposing `ETag`.
4. In Vercel, go to **Settings → Environment Variables (Production)** and set
   `MEDIA_PUBLIC_BASE_URL=https://media.<domain>`, with no trailing slash.
5. Redeploy **without the build cache**. The prerendered pages bake in media
   URLs.
6. Verify:
   ```text
   SITE_URL=<site origin> npx tsx --env-file=.env.prod-ops scripts/storage-check.ts
   ```
   Update `MEDIA_PUBLIC_BASE_URL` in `.env.prod-ops` first. Then:
   - the public smoke test: every page view clean and no broken images;
   - `curl -sI <site>/ | grep -i content-security-policy` names
     `media.<domain>` and no longer names `r2.dev`;
   - page HTML contains no `r2.dev`.
7. Once the site is verified, disable the bucket's **r2.dev** public access.
   Keep it enabled until then: it is the rollback path.

**Rollback:** set `MEDIA_PUBLIC_BASE_URL` back to the r2.dev URL and redeploy.

## B. Site: `*.vercel.app` → `<domain>`

1. In Vercel, go to **Settings → Domains → Add** and enter `<domain>`, plus
   `www.<domain>` redirecting to it (or the reverse; choose one canonical
   host).
2. In Cloudflare DNS, add the records Vercel shows. Typically these are an
   `A` record for the apex (`76.76.21.21`) and a `CNAME www → cname.vercel-dns.com`.
   Set both to **DNS only** (grey cloud). Proxying through Cloudflare in front
   of Vercel breaks Vercel's certificate issuance and duplicates the CDN.
3. When Vercel shows the domain as valid, set the Production variables:
   - `SITE_URL=https://<domain>`
   - `APP_ORIGINS=https://filmmaker-portfolio-beta.vercel.app`. This is only
     needed while Studio sessions may still come from the old host; remove it
     afterwards.
4. Add `https://<domain>` to both buckets' CORS rules (A.3).
5. Redeploy without the build cache. Canonical URLs, Open Graph, the sitemap,
   robots and HSTS all derive from `SITE_URL`.
6. Verify:
   - the public and admin smoke scripts with `SITE=https://<domain>`;
   - `storage-check` with the new `SITE_URL`;
   - `/sitemap.xml` and `/robots.txt` name the new origin;
   - Studio upload from the new origin succeeds.
7. Keep the `*.vercel.app` host serving. Vercel keeps it automatically. It is
   also where a Preview deployment would live, and Preview has no production
   environment (`deployment.md` §6).

The admin session cookie is host-only, so the admin signs in again on the new
host.

## Owner inputs needed

- The domain, and confirmation that its DNS is on (or may be moved to)
  Cloudflare.
- Approval to change DNS, and to disable `r2.dev` access after verification.
