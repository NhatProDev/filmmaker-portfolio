# Media migration to production storage

- **Status:** Prepared, not executed. Phase 2G-A adds the storage adapter, the
  private-key convention and the dry-run manifest. Nothing has been uploaded,
  moved, deleted or re-encoded.

## 1. Delivery model (ADR-0014 §4)

```text
public asset    storage key  →  MEDIA_PUBLIC_BASE_URL/<key>            (CDN, cacheable)
private asset   private/<key> →  /api/v1/public/projects/<slug>/media/<id>
                                   → access cookie verified
                                   → referenced by the published snapshot?
                                   → 302 to a SigV4 presigned GET, MEDIA_SIGNED_URL_TTL_SECONDS
```

- A key under `private/` has no public URL: `publicUrl()` throws, the Studio
  shows no public preview, and a public page that references one cannot be
  published.
- Large private video is served by storage directly (the redirect); the
  application never proxies its bytes with the `s3` adapter.
- Locally, private keys live in `MEDIA_PRIVATE_ROOT` (`storage/private`,
  outside `public/`, gitignored) and the route streams them with byte ranges.
  No cloud provider is needed for development.
- A signed URL outlives a revoked grant by at most its TTL; every new request
  re-checks access.

**Current state:** every asset today is public (the manifest finds no
PRIVATE-only media), and legacy keys still sit in `public/media`, reachable by
exact key. A private project's media stop being publicly addressable only when
they are moved under `private/` (§3 step 4).

## 2. The manifest

```text
npm run media:manifest                          summary
npm run media:manifest -- --out=manifest.json   full JSON (deterministic)
```

Per entry: canonical media id (or `null` for a file only static About/Contact
content uses), recorded checksum and the file's SHA-256, current source
(provider, key, path, exists, size), audience, whether production needs it
(`deploy`), target bucket and key, MIME type, dimensions, duration, default
poster, the videos it is the default poster of, placement-poster uses, and
every usage with its owner and audience.

Findings: missing files, duplicate content among deployed files, target
collisions (case-insensitive, per bucket), and recorded metadata that disagrees
with the file.

Last local run (database mode, imported content): 26 files to deploy
(22 database assets + 4 About/Contact stills), ~58 MB, all public; 0 missing,
0 collisions, 0 mismatches; 4 duplicates — About/Contact keep their own copies
of four stills that are also database assets.

## 3. Execution plan (2G-B, after approval)

1. `npm run media:manifest -- --out=manifest.json` against the production
   database after the import; review it. It must report 0 missing, 0
   collisions.
2. Upload every `deploy: true` entry with `target.bucket = public` to the
   public bucket at `target.key`, with its MIME type as `Content-Type` and a
   long `Cache-Control` (keys are content-stable):
   `npm run media:upload -- --manifest=manifest.json` (dry run), then with
   `--apply`. Create-only: it never overwrites an object with other bytes.
3. Verify: `npm run media:upload -- --manifest=manifest.json --verify-delivery`
   reads every public object back through the CDN and compares its SHA-256;
   a second dry run reports every object `unchanged`.
4. For `target.bucket = private` entries (none today): upload to the private
   bucket at `target.key`, then update that asset's `storage_key` to the
   `private/` key in one transaction, and republish the projects that use it.
5. `npm run db:health` and a browser check of each page type.

Originals are never re-encoded by this plan.
