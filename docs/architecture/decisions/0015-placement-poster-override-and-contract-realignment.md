# ADR-0015 — Placement poster override, strict ownership wording, baseline provenance and contract realignment

- **Status:** Approved
- **Date:** 2026-09-24
- **Decided by:** Project Owner / Software Architect (Phase 2C finalisation directive)
- **Amends:** ADR-0009 §1 and §3 (poster placement and resolution order) · ADR-0014 §3 (posters)
- **Clarifies:** ADR-0007 §2 (the exactly-one-owner SQL)
- **Related:** ADR-0001 (root `db/`), ADR-0011 (contextual alt), ADR-0012 (published snapshot), ADR-0013 (strict ownership)
- **Affects:** CLAUDE.md §6, §11, §12, §13, §14, §17 · `db/schema.ts` · `db/migrations/0004_*.sql` · `openapi.yaml`
- **Change class:** Database relationship change and DTO semantics (CLAUDE.md §20)

## Problem

Four loose ends were left when Phase 2C applied the composer schema:

1. **One clip, two posters.** The committed site shows `n3.mp4` twice: as the
   Made to Measure loop over the *mannequin* still, and as the fourth Home wall
   cell over the *table* still. ADR-0009 allows exactly one poster per asset,
   so the database could reproduce only one of the two. The live site would
   change on the day the database becomes the source.
2. **ADR-0007's ownership SQL is looser than its prose.** Its illustrative
   `CHECK` admits a GRID child that also names a project, which leaves the
   child's container ambiguous. ADR-0013 §3 and the schema already use the
   strict form. The two ADRs do not say the same thing.
3. **The initial migration was edited.** `0001_initial.sql` was normalised for
   the Drizzle migrator. Nothing recorded why, or what the edit may and may not
   change.
4. **`openapi.yaml` describes the pre-composer model.** It has URL-based media,
   open block `config`, and no pages, block content, posters, preview media or
   container scope. CLAUDE.md §22 ranks the HTTP contract above the code. A
   contract that contradicts the domain it fronts is a defect.

## Decision

### 1. Posters: an asset default plus an optional placement override

```text
media.poster_media_id        uuid NULL  -- the asset's default poster (ADR-0009)
block_media.poster_media_id  uuid NULL  -- this placement's poster, when it differs
                             REFERENCES media(id) ON DELETE RESTRICT
```

Resolution order, replacing ADR-0009 §3:

```text
block_media.poster_media_id      the placement override
  → media.poster_media_id        the asset default
    → generated/provider thumbnail   (media.thumbnail_url until variants exist)
      → empty media frame
```

- **The default remains a property of the asset.** ADR-0009's reasons still
  hold. The same footage normally shows the same still, and curating a
  nine-tile wall takes zero overrides. An override is the exception, not a
  second place to set every poster.
- **The override is relational.** It is never an id in `block_media.config` or
  `project_blocks.config` (CLAUDE.md §6). It exists so that a deliberate
  editorial choice, like the Home wall's table still, does not force the same
  bytes to be stored twice as two assets.
- **Type rules** follow ADR-0009 §4, and the service checks them:
  - the placement's own media must be `VIDEO` or `EXTERNAL_VIDEO`;
  - the target must be a live `IMAGE` with `status = READY`;
  - the target must not be the placement's own media.
- **`MEDIA_IN_USE` covers the override.** The in-use query inspects every
  relational reference:
  - `projects.cover_media_id`
  - `projects.preview_media_id`
  - `block_media.media_id`
  - `block_media.poster_media_id`
  - `media.poster_media_id`
  - from ADR-0012 onward, every media id referenced by a current published
    snapshot

  A reference held by a soft-deleted project, or by a soft-deleted video asset,
  no longer counts, because V1 has no restore.
- **Letterbox coupling (ADR-0009 §5) applies to the override as well.** Any
  poster shown over a video must receive the same active-area treatment as that
  video.

### 2. Ownership is strict

This replaces ADR-0007 §2's illustrative SQL, and matches ADR-0013 §3 and the
schema (`project_blocks_single_owner_check`):

```text
  (project_id IS NOT NULL AND page_id IS NULL     AND parent_block_id IS NULL)
OR (project_id IS NULL     AND page_id IS NOT NULL AND parent_block_id IS NULL)
OR (project_id IS NULL     AND page_id IS NULL     AND parent_block_id IS NOT NULL)
```

- A root block names exactly one of project or page.
- A child names only its parent.
- A child's container is its parent. Its page or project is its parent's.

### 3. Provenance of the `0001` baseline

`db/migrations/0001_initial.sql` differs from the reviewed original in form
only:

- The explicit `BEGIN`/`COMMIT` were removed. The Drizzle migrator wraps each
  migration in its own transaction, and a `COMMIT` inside the file would end
  that transaction early.
- `--> statement-breakpoint` markers were added, so every driver runs each
  statement separately.
- A header comment records both changes.

On PostgreSQL 18.3 (PGlite), the original and the normalised file produce
identical catalogs: every table, column, type, default, constraint, index and
enum value, 137 of 137 catalog facts. **No semantic DDL change is permitted in
`0001`.** Any schema change is a new migration.

Two supporting choices keep the baseline stable:

- The journal registers `0001` with a fixed timestamp at index 1, so
  `drizzle-kit generate` numbers new migrations from `0002`.
- `db/schema.ts` names every foreign key in PostgreSQL's default
  `<table>_<column>_fkey` form, so drizzle-kit sees no difference against the
  hand-written baseline.

### 4. The HTTP contract matches the domain

`openapi.yaml` is realigned with CLAUDE.md, ADRs 0006–0015 and the schema. It
takes no new decisions. It describes what those documents already decided:

- **Blocks** are an explicit `oneOf` over the seven block types, with `type` as
  the discriminator. Each variant has typed `content` and a closed `config`.
  Blocks also carry `parentBlockId`, `isHidden` and `children`.
- **Media** carries identity, not URLs:
  - identity: `storageProvider`, `storageKey`, `checksumSha256`;
  - a `deliveryUrl` derived at read time (ADR-0014);
  - `posterMediaId`, and a depth-1 `poster`.
- **Block media** carries contextual `altText` (ADR-0011) and the placement
  `posterMediaId` (§1).
- **Projects** carry `role`, `runtime`, `previewMediaId` and publication state
  (ADR-0011, ADR-0012).
- **Pages** (Home) have their own composition routes (ADR-0007).
- **Reordering** is container-scoped (ADR-0006). **Duplication** is an explicit
  action. **Media usages** are readable, so the administrator can see why a
  delete returns `409`.
- **Uploads** return `503 STORAGE_UNAVAILABLE` while no storage provider is
  configured (ADR-0014 §6). They are never faked.
- **Public project DTOs** describe the published view (ADR-0012), not the
  working copy.

## Why

- A placement override is the smallest change that represents the committed
  site exactly, without duplicating assets. Duplicating would break checksum
  identity (ADR-0014 §1).
- Keeping the asset default preserves everything ADR-0009 was approved for,
  including administrator work proportional to the library.
- One ownership rule, written once, cannot be implemented two ways.
- A recorded provenance makes the `0001` edit auditable and bounded.
- A contract that matches the domain is the precondition for the admin API.

## Compatibility impact

- **Additive.** `block_media.poster_media_id` is nullable, and a null value
  inherits the asset default, which is exactly the previous behaviour.
- The public site is unchanged. With the override, the database reproduces the
  committed static content byte for byte.
- `openapi.yaml` changes DTO shapes. No client of the old shapes exists.

## Migration impact

`db/migrations/0004_placement_poster_override.sql` adds:

- the column;
- `block_media_poster_media_id_fkey` (`ON DELETE RESTRICT`);
- `block_media_poster_media_id_idx`, for the in-use lookup.

No data is rewritten, and `0002` is not edited. The static importer sets an
override only where a placement's poster differs from its video's default. In
the committed content that is one placement: Home wall cell 4.

## Implementation constraints

1. The in-use query covers all five relational references. From ADR-0012
   onward, it also covers snapshot references.
2. Validate override type rules in the service, not the route handler.
3. Never accept a poster id through `config`.
4. The Studio shows the inherited default next to any override, so the
   administrator can see when a placement differs from its asset.
5. No semantic DDL change to `0001`, ever.

## Alternatives considered

- **Duplicate the clip as a second asset with its own poster.** Rejected. It
  defeats checksum identity, and the unique-checksum index forbids it.
- **Change the Home wall to use the project's poster.** Rejected. It changes
  the locked public site to suit the data model.
- **Posters per placement only (no asset default).** Rejected for ADR-0009's
  reasons: it multiplies the administrator's work by placement count.
- **Leave `openapi.yaml` stale until the REST phase.** Rejected. The REST phase
  implements against the contract, so the contract must be correct first.
