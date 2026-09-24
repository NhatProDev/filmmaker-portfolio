# ADR-0020 — Private uploads and storage-provider realignment

- **Status:** Approved. The owner requested private uploads in the Phase 3C
  brief (3C-5). The realignment fixes a gap found by the Phase 3B production
  smoke.
- **Date:** 2026-09-24
- **Related:** ADR-0014 §1 and §4 (identity, private media), CLAUDE.md §12,
  `docs/operations/media-migration.md`
- **Change class:** Additive request and DTO fields. A one-off data
  realignment with its own script.

## Problem

1. The Studio uploads only public originals. A private project's film
   therefore gets a permanent public URL the moment it is uploaded.
2. The production media migration copied every file to R2, but it left
   `media.storage_provider = 'local'` on the 22 imported rows. Identity is
   provider + key (ADR-0014 §1), so the Studio finds no delivery URL for them.
   The admin media route refuses them as well. Public pages resolve by key
   alone and are unaffected.

## Decision

### 1. Upload audience

`POST /media/uploads` takes `audience: PUBLIC | PRIVATE`, defaulting to
PUBLIC.

- A PRIVATE original's key is `private/originals/<mediaId>/<file>`. The
  adapter sends it to the private bucket through a short-lived presigned PUT.
- The asset never has a public URL. `deliveryUrl` stays `null` and the DTO
  gains `isPrivate`. The Studio previews it through the admin-only signed
  route (Phase 3B).
- Completion, checksum dedup, `MEDIA_IN_USE` and soft delete are unchanged.
  Checksums are unique across both audiences. A private upload of bytes
  already in the library is refused with the existing asset's id, whatever
  its audience.
- Public pages cannot publish a private asset (existing rule). A PRIVATE
  project delivers it only through its access-checked media route.

Changing an existing asset's audience is **not** offered. It would move
objects between buckets, and upload-again is simpler and auditable.

### 2. Provider realignment

`npm run media:realign-provider` (dry run by default, `--apply` to write)
changes rows recorded under another provider to the configured adapter's
provider, only after the adapter confirms that the object exists at that key.
In the **same transaction** it rewrites `storageProvider` in every current
snapshot's media records. Rendering ignores the field, so no project or page
starts reporting unpublished changes.

The script is idempotent: a second run changes nothing. Like every script, it
refuses a remote database without `--confirm-remote`, and it must be
rehearsed on a restored dump first.

## Compatibility impact

Additive. `audience` is optional and `isPrivate` is a new DTO field.

## Migration impact

No schema change. The realignment is a data operation run at deployment time
(`content-system.md` §11).

## Alternatives considered

- **An `audience` column on media.** Rejected: the key prefix already decides
  delivery (ADR-0014 §4). A second source of truth could disagree with it.
- **Ignoring the provider when resolving URLs.** Rejected: it would give up
  provider + key identity for good.
