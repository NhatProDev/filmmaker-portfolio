# Domains: site and media (owner-controlled)

Production today runs on two provider host names (`deployment.md` §5):

- site: `https://filmmaker-portfolio-beta.vercel.app`
- public media: the public bucket's `https://pub-….r2.dev` URL

`r2.dev` is rate-limited and not meant for production traffic. Both moves
below change DNS, so each waits for the owner:

- to choose or buy a domain (buying costs money, so the owner does that);
- to approve the change.

**Nothing in this file has been applied.** It was brought up to date for
Phase 3D (3D-17 and 3D-18). `<domain>` below stands for the owner's domain,
e.g. `example.com`.

**Why the moves are cheap.** The database and every published snapshot store
media **keys**, never URLs. URLs are derived at render time from
`MEDIA_PUBLIC_BASE_URL`. The CSP's media origins, canonical URLs, Open Graph,
the sitemap, robots and HSTS all derive from the environment. So each move is
**env change → redeploy without the build cache**, with **no database
migration**.

## Topology after both moves

```text
<domain>, www.<domain>        → Vercel (Next.js site, Studio, /api/v1)
media.<domain>                → Cloudflare R2 public bucket (custom domain)
<account>.r2.cloudflarestorage.com
                              → S3 API: presigned uploads (both buckets) and
                                presigned private delivery (private bucket)
private bucket                → never has a public domain
```

## Prerequisite

For an R2 custom domain, the domain's DNS must be on Cloudflare. It can be
registered anywhere, with its nameservers pointed at Cloudflare. A zone on the
Free plan costs nothing.

## A. Media: `r2.dev` → `media.<domain>` (3D-18)

Do A before or together with B. A needs only the zone on Cloudflare.

1. **Attach.** In Cloudflare, open **R2 → portfolio-media-public → Settings
   → Custom Domains → Connect Domain** and enter `media.<domain>`.
   Cloudflare creates the DNS record and the certificate. Wait until the
   status reads **Active**. Do this for the **public bucket only**: the
   private bucket keeps no public domain.
2. **Compare before switching.** For the same key, both hosts must return
   identical bytes:
   ```text
   OLD=https://pub-….r2.dev   NEW=https://media.<domain>
   for K in home/n1.mp4 home/mtm-atelier.jpg; do
     curl -s $OLD/$K | sha256sum; curl -s $NEW/$K | sha256sum; done
   curl -sI -H "Range: bytes=0-99" $NEW/home/n1.mp4      # 206 Partial Content
   curl -sI $NEW/home/mtm-atelier.jpg | grep -i cache-control   # public, max-age=31536000, immutable
   curl -s -o /dev/null -w "%{http_code}\n" $NEW/private/anything   # 404
   ```
3. **Caching (optional, free).** A Cloudflare Cache Rule on
   `media.<domain>` can give Studio uploads the one-year browser TTL that
   imported media already carry. Their keys (`originals/<id>/…`) never change.
4. **CORS.** CORS belongs to the bucket, not the host name, so it carries
   over. Once the site domain exists (B), add `https://<domain>` (and `www`,
   if it serves) to **both** buckets' allowed origins. Use the same rule as
   now:
   - methods `GET`, `HEAD` and `PUT`;
   - header `content-type`, plus `x-amz-checksum-sha256` if upload checksums
     are on (`media-lifecycle.md` §4);
   - expose `ETag`.
5. **Environment.** In Vercel **Settings → Environment Variables
   (Production)**, set `MEDIA_PUBLIC_BASE_URL=https://media.<domain>` (no
   trailing slash). Update `.env.prod-ops` too.
6. **Redeploy without the build cache.** The prerendered pages bake in media
   URLs, and the CSP bakes in media origins.
7. **Verify.**
   - `SITE_URL=<site origin> npx tsx --env-file=.env.prod-ops scripts/storage-check.ts`
     passes;
   - `curl -sI <site>/ | grep -i content-security-policy` names
     `media.<domain>` and no longer names `r2.dev`;
   - `curl -s <site>/ <site>/works <site>/about | grep -c r2.dev` is 0;
   - the public smoke test passes: every page loads, no broken images, films
     play, and the Works previews move;
   - Studio thumbnails load in the Media Library, and a new upload shows
     its thumbnail;
   - a private project's films still play after unlock (the private bucket
     is unaffected);
   - `npm run db:health -- --confirm-remote=…` is healthy.
8. **Keep r2.dev enabled** until the site is verified. It is the rollback.
   Afterwards, disable the bucket's **r2.dev** public access.

**Rollback:** set `MEDIA_PUBLIC_BASE_URL` back to the r2.dev URL (re-enable
r2.dev access if it was disabled) and redeploy without the cache. No data
changes in either direction.

## B. Site: `*.vercel.app` → `<domain>` (3D-17)

1. **Add the domain in Vercel.** In **Settings → Domains → Add**, enter
   `<domain>` and `www.<domain>`. Choose one canonical host (e.g. the apex)
   and set the other to **redirect** to it (308).
2. **Get the DNS records.** Vercel shows the records it needs. Typically:
   - an `A` record for the apex (`76.76.21.21`);
   - a `CNAME` from `www` to `cname.vercel-dns.com`.
   Use the values Vercel shows, not these examples.
3. **Configure apex and www in Cloudflare DNS.** Add both records as **DNS
   only** (grey cloud). Proxying through Cloudflare in front of Vercel breaks
   Vercel's certificate issuance and duplicates the CDN.
4. **Verify SSL.** Wait until Vercel shows both domains as **Valid
   Configuration** with a certificate. Then
   `curl -sI https://<domain>/ | head -1` must answer 200, and
   `curl -sI https://www.<domain>/` must answer 308 to the canonical host
   (or the reverse).
5. **Update `SITE_URL`.** In Vercel Production, set
   `SITE_URL=https://<domain>` (the bare canonical origin). While Studio
   sessions may still come from the old host, also set
   `APP_ORIGINS=https://filmmaker-portfolio-beta.vercel.app`; remove it
   afterwards.
6. **Redeploy without the build cache.** `SITE_URL` is read at build time.
7. **Canonical.** `curl -s https://<domain>/works | grep -o '<link rel="canonical"[^>]*>'`
   names `https://<domain>/works`, and `og:url` matches.
8. **Sitemap.** `curl -s https://<domain>/sitemap.xml` lists only
   `https://<domain>/…` URLs.
9. **Robots.** `curl -s https://<domain>/robots.txt` names
   `Sitemap: https://<domain>/sitemap.xml` and disallows `/admin` and `/api/`.
10. **CSP and HSTS.**
    - `curl -sI https://<domain>/` shows the CSP (media origins unchanged
      unless A is done) and
      `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
    - HSTS covers subdomains, so `media.<domain>` must serve https, which R2
      custom domains always do.
11. **Auth cookies.** The admin session cookie is host-only
    (`HttpOnly; Secure; SameSite=Strict`). The admin signs in again on the
    new host. Check sign-in, sign-out, and that a replayed session is refused
    after sign-out.
12. **Private project access.** Access cookies are host-only too: visitors
    unlock again on the new host. Check a PRIVATE project's gate: a wrong
    password is refused, the right one unlocks, the page is `noindex`, and
    its films play.
13. **CORS.** Add `https://<domain>` to both buckets (A.4). Then check a
    Studio upload (public and private) from the new host, and run
    `storage-check` with the new `SITE_URL`.
14. **Old host.** Vercel keeps `*.vercel.app` serving. Optionally set it to
    redirect to `<domain>` in **Settings → Domains**. Canonical URLs already
    point to the new host.

**Rollback:** set `SITE_URL` back to the `*.vercel.app` origin and redeploy.
The DNS records can stay; the site simply is not canonical there.

## Owner inputs needed

- The domain, and confirmation that its DNS is on (or may be moved to)
  Cloudflare.
- Approval to change DNS, and to disable `r2.dev` access after verification.
