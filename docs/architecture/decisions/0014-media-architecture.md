# ADR-0014 — Media architecture

- **Status:** Approved — **§3 amended by [ADR-0015](0015-placement-poster-override-and-contract-realignment.md)**
- **Date:** 2026-09-24
- **Decided by:** Project Owner / Software Architect (Phase 2 architecture report, with Director clarifications)
- **Related:** ADR-0008 (playback), ADR-0009 (posters), ADR-0011 (contextual alt), ADR-0003 (private projects)
- **Affects:** CLAUDE.md §12, §16 · `db/schema.ts` · `src/lib/storage/`
- **Change class:** Database table/relationship redesign (CLAUDE.md §20)

> **Amendment notice.** ADR-0015 §1: the asset's poster is its default, and a
> placement may override it with `block_media.poster_media_id` (migration
> `0004`).

## Problem

Runtime media is a gitignored local folder referenced by hard-coded paths. A
deployment from Git ships no media, the same file is copied into several
folders, and nothing records what an asset is independently of where it is
served from.

## Current behaviour before this decision

`mediaUrl(key)` builds `/media/<key>`; the `media` table exists but stores
optional absolute URLs.

## Decision

### 1. Identity is provider + key, never a URL

The database stores an asset's **identity and metadata**: `storage_provider`,
`storage_key`, type, MIME type, dimensions, duration, byte size, checksum,
status, default alt, poster.

**Delivery URLs are derived at read time** by the resolver (`mediaUrl(key)`,
backed by the storage adapter) from environment configuration. An absolute CDN
URL is never canonical identity. `media.url` is retained only for
`EXTERNAL_VIDEO` and legacy use and is not read for hosted media;
`media.thumbnail_url` is retained as ADR-0009's automatic fallback until a
derivative replaces it.

- `(storage_provider, storage_key)` is unique.
- `checksum_sha256` identifies content: unique among non-deleted assets, so the
  same bytes are one asset, however many placements use them.

### 2. Originals and delivery derivatives are separate

`storage_key` is the **original**. Delivery derivatives (image widths, video
renditions, automatic poster frames) will live in a `media_variants` table owned
by the asset. **That table is not created yet:** no pipeline generates variants,
and adding it later is additive. For assets imported from the current local
package, the web file is the best available original.

Future upload keys: `originals/<mediaId>/<filename>` and
`variants/<mediaId>/<kind>.<ext>`.

### 3. Posters and alt

- The poster belongs to the media asset (`media.poster_media_id`, ADR-0009,
  applied in migration `0002`).
- A placement may override alt text, including `''` for decorative use
  (ADR-0011).

### 4. Private media

Media referenced only by PRIVATE projects must eventually **not** be delivered
through an unrestricted public URL. The adapter will issue signed, short-lived
delivery URLs (or an equivalent) for them. This is implemented with the private
project gate.

### 5. Providers stay behind adapters

Storage and video providers sit behind `MediaStorage` in `src/lib/storage/`:
resolve a delivery URL, create a signed upload, verify a completed upload,
delete an object. Provider-specific playback identifiers belong behind the
adapter, not in the general `media` columns. **No provider is chosen by this
ADR**; the choice stays replaceable.

The only implementation today is `local`: keys resolve under `/media`, served
from `public/media`. `MEDIA_PUBLIC_BASE_URL` may override the base; by default
output is unchanged.

### 6. Deployment blocker

**Foundation ready — provider and migration pending.** The blocker is resolved
only when production media has a durable external storage and delivery path.

## Why

- Keys survive a change of CDN, bucket or environment; URLs do not.
- Checksum identity removes the copies the local package accumulated.
- Adapters keep a provider decision reversible.

## Compatibility impact

Additive. `mediaUrl(key)` output is unchanged by default.

## Migration impact

Migration `0002` adds `poster_media_id`, `checksum_sha256`, their constraints
and the identity index. No data is rewritten.

## Implementation constraints

1. Never persist a derived delivery URL as identity.
2. Never read `media.url` for hosted media.
3. Deduplicate by checksum on import and on upload completion.
4. Signed delivery for private-only media before any private project ships.
5. Keep provider SDKs inside `src/lib/storage/`.

## Alternatives considered

**Store absolute URLs.** Rejected: ties data to one environment and one CDN.

**Create `media_variants` now.** Rejected: nothing generates variants yet, and the
table is additive later.

**Choose a video provider now.** Rejected: out of scope; the adapter keeps it
open.
