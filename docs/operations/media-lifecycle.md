# Media lifecycle and upload integrity

How a media object is born, used, retired and removed, across PostgreSQL and
the two R2 buckets. Written in Phase 3D (3D-13, 3D-14).

## 1. Life of an object

```text
Studio                API (Next.js)                       R2
  │ POST /media/uploads ─▶ row: UPLOADING, key reserved
  │ ◀── presigned PUT (5 min) ─┘
  │ PUT bytes ───────────────────────────────────────────▶ public or private bucket
  │ POST /media/{id}/complete ─▶ HEAD (size, provider checksum)
  │                             row: READY (or PROCESSING: a video whose
  │                             frame the browser could not read)
  ▼
used by placements, covers, posters, page slots, albums, published snapshots
  │
  │ DELETE /media/{id}  (refused with 409 MEDIA_IN_USE while anything uses it)
  ▼
row soft-deleted (deleted_at); the object stays until media:gc removes it
```

- **Keys, not URLs.** The database and every snapshot store storage keys.
  `MEDIA_PUBLIC_BASE_URL` turns a public key into a URL at render time. A
  private key (`private/…`) has no public URL. It is delivered only through a
  short-lived signed URL, after the access check (ADR-0020).
- **Soft delete only.** Neither the Studio nor the API ever removes an object.
  Deleting a block removes placements, not assets (CLAUDE.md §12).
- **Duplicates.** Identical bytes, identified by SHA-256, are one asset. A
  duplicate upload is discarded at completion: its row is soft-deleted and its
  object removed.

## 2. What can be left behind

| Leftover | How it arises | What happens to it |
|---|---|---|
| Abandoned upload | The browser got an authorisation but never completed (tab closed, network lost) | The row stays `UPLOADING`. The object may exist. `media:gc` soft-deletes the row after 48 h and removes the object |
| Failed completion | Size mismatch or checksum mismatch (409 `UPLOAD_MISMATCH`) | Row stays `UPLOADING`: same as above |
| Soft-deleted asset | Studio **Delete** on an unused asset | Object kept. `media:gc` removes it once the deletion is older than the grace period (30 days) and nothing references it |
| Archived project's media | Archiving keeps every reference | Kept: archived and soft-deleted owners still count as references |
| Static-content files | `about/…`, `contact/…`, `home/…` objects uploaded for the committed site | Kept: the static fallback still uses them |
| Probes | `storage-check` and ad-hoc probes under `_probe/`, `private/_probe/` | Removed by their own script; `media:gc` removes any older than an hour |
| True orphans | An object no row names (a manual upload, an interrupted migration) | Removed after the grace period |

## 3. `media:gc`: dry run first

```text
npm run media:gc -- --confirm-remote=<host>/<db>                         dry run
npm run media:gc -- --confirm-remote=<host>/<db> --out=gc.json           and JSON
npm run media:gc -- --confirm-remote=<host>/<db> --apply \
     --confirm-storage=<public-bucket>+<private-bucket>                  remove
```

In production, run it with `npx tsx --env-file=.env.prod-ops scripts/media-gc.ts …`.

**What it reads.** It lists both buckets, and reads the database in **one
read-only, repeatable-read transaction**:

- every media row;
- every relational reference, whether the owner is live, archived or
  soft-deleted: project cover and preview, placement media and placement
  poster, asset default poster, page media slots, album items and covers, and
  `publication_media`;
- the text of every published snapshot (project, page, album), every page's
  content and every block's content. A key found there is kept. This is a
  safety net: §6 keeps media out of JSON.

It also reads every key the committed static content uses.

**Rules.** An object is kept if a live row names it, a referenced row names it,
static content uses it, a document mentions it, or it is younger than the
grace period. A `private/` key in the public bucket, or the reverse, is
reported as `MISPLACED` and never removed. The report is sorted and
deterministic.

**Safeguards on `--apply`:**

- the database target must be confirmed (`--confirm-remote`);
- both bucket names must be typed for the run (`--confirm-storage`);
- at most `--max-delete` (25) removals;
- it plans twice and acts only on what both plans agree on;
- an abandoned row is soft-deleted only if it is still `UPLOADING` under a
  row lock.

Take a `pg_dump` first (`runbook.md` §4). An object removed from a bucket
without versioning is gone.

**Production dry run, 2026-09-24 (Phase 3D).** The buckets hold 27 objects:
22 belong to live assets and 4 are static-content keys (the old `about/` and
`contact/` stills). One is recent: the soft-deleted Phase 3C smoke PNG, still
inside the grace period. Nothing is eligible. After 2026-10-24 that PNG
becomes a `DELETED_ASSET` candidate. Removing it needs the owner's approval.

## 4. Upload integrity

The server never sees upload bytes: they go straight from the browser to R2
(CLAUDE.md §12). What the server can prove:

| Property | How | Trust |
|---|---|---|
| The object exists | Signed `HEAD` at completion | Provider |
| Its size is the authorised size | `content-length` against the size signed at authorisation | Provider |
| Its SHA-256 | See below | Provider when enabled; otherwise the browser |
| Its type is an allowed image or video type | MIME allow-list at authorisation; `content-type` bound into the PUT | Browser-declared; not sniffed |
| Frame size and duration | Measured by the browser | Browser-declared, bounded by validation |

**Provider-verified checksums (`S3_UPLOAD_CHECKSUMS=true`).** The browser
hashes the file (files up to 500 MB) and declares the SHA-256 at
authorisation. With the switch on, the presigned PUT binds it as a signed
`x-amz-checksum-sha256` header. R2 hashes the body it receives and refuses a
mismatch with `400 BadDigest`. At completion, the `HEAD` asks for checksum
mode, and R2 returns the SHA-256 it computed. The server records that value,
never the browser's. A browser that declares different bytes is refused
(`409 UPLOAD_MISMATCH`).

This was verified against production R2 on 2026-09-24 with probe objects,
which were removed afterwards:

- a correct header gives 200, and `HEAD` returns the same digest;
- a wrong header gives 400 `BadDigest`, and no object is stored;
- the same value hoisted into the query string is **ignored** by R2. That is
  why it must be a header.

**It is off until CORS allows the header.** Both buckets' CORS rules
currently allow only `content-type`. A browser preflight that also asks for
`x-amz-checksum-sha256` is refused with 403. To turn it on (an owner action
in the Cloudflare dashboard):

1. On **both** buckets, add `x-amz-checksum-sha256` to the CORS rule's
   AllowedHeaders, next to `content-type`.
2. Run `storage-check` with `S3_UPLOAD_CHECKSUMS=true`. It must report
   `CORS allows x-amz-checksum-sha256` on both buckets.
3. Set `S3_UPLOAD_CHECKSUMS=true` in Vercel (Production, run time) and
   redeploy.
4. Upload one still in the Studio. Its checksum must match `sha256sum` of the
   file.

**What is never used as a checksum.** ETags are never used: a multipart
upload's ETag is not a hash of the object, and a single-part ETag is MD5.

**Residual risk.** Two cases remain:

- **The switch is off.** The recorded SHA-256 is the browser's claim. Only an
  authenticated admin can upload, so the risk is a wrong duplicate decision or
  a wrong integrity record, not unauthorised content.
- **Files over 500 MB.** The browser does not hash them, and their checksum is
  whatever the provider keeps (nothing, without a bound header).

Size is always provider-verified. Media type is not sniffed server-side,
because the server never decodes media (ADR-0014). Browsers render only what
they can decode, and the CSP limits where media load from.
