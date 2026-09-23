# ADR-0009 — Administrator-selected poster media

- **Status:** Approved — **§1 and §3 amended by [ADR-0015](0015-placement-poster-override-and-contract-realignment.md)**
- **Date:** 2026-09-22
- **Decided by:** Project Owner / Software Architect
- **Supersedes:** ADR-0008 §7's deferral of administrator-selected posters
- **Related:** ADR-0008 (playback model), ADR-0004 (no media identity in config)
- **Affects:** CLAUDE.md §6, §12, §14, §17 · `db/schema.ts` (deferred) · `openapi.yaml` (deferred)
- **Change class:** Database table/relationship redesign (CLAUDE.md §20)

> **Amendment notice.** ADR-0015 §1 keeps `media.poster_media_id` as the asset's
> **default** poster and adds an optional **placement override**,
> `block_media.poster_media_id`. Resolution becomes placement override → asset
> default → generated/provider thumbnail → empty frame. The override also
> participates in `MEDIA_IN_USE`. The "not per-placement" rejection below
> stands against per-placement posters *as the only mechanism*.

## Problem

ADR-0008 §7 deferred administrator-selected posters and used
`media.thumbnail_url` for V1. Design exploration produced three independent
arguments for reversing that priority, and the Project Owner has **approved
administrator-selected poster media as a V1 requirement**.

The evidence:

1. **The poster is what a visitor actually sees, most of the time.** On a wall
   it covers fast scroll, autoplay refusal, the released off-screen state, and
   reduced motion. The poster *is* the composition more often than the video is.
2. **Auto-generated first frames are frequently unusable** — black, a slate, or
   motion blur. One clip in the current library opens on near-darkness for a
   third of its duration.
3. **Letterbox trimming must apply identically to poster and video**, or the
   poster→video swap produces a visible scale jump (~12% on the worst clip
   measured).

The constraint that makes this an architecture question rather than a field
addition: **a poster reference must participate in `MEDIA_IN_USE` protection**,
and CLAUDE.md §6 forbids storing media relationships in JSON config. A media
UUID inside `config` is invisible to the in-use guard, so the poster would be
deletable and every tile referencing it would break.

## Current behaviour before this decision

`media.thumbnail_url` — a text URL, typically an auto-generated first frame.
No administrator control, no relationship, no protection.

## Decision

### 1. A poster is a property of the asset, not of the placement

```text
media.poster_media_id  uuid NULL  REFERENCES media(id) ON DELETE RESTRICT
```

A self-reference on `media`. A VIDEO row points at the IMAGE row that is its
poster.

**Not per-placement.** A video's poster frame is intrinsic to the clip: the same
footage should present the same still wherever it appears. Per-placement posters
would mean setting the poster nine times for a nine-tile wall, and would let the
same clip look like two different works on one page.

### 2. `MEDIA_IN_USE` protection is extended, and the FK enforces it

The in-use check currently inspects `projects.cover_media_id` and
`block_media.media_id`. It gains a third source:

```text
media.poster_media_id
```

An IMAGE referenced as a poster **cannot be deleted** — the attempt returns
`409 MEDIA_IN_USE`, exactly as for a cover or a block reference.

`ON DELETE RESTRICT` matches the existing `block_media.media_id` pattern and
gives a database-level backstop. Note this is a backstop only: **media deletion
is soft** (`deleted_at`), so the FK action does not fire on the normal path. The
binding enforcement is the service-level in-use query, and that query must be
extended or this decision is not implemented.

### 3. Resolution order

```text
poster_media_id  →  thumbnail_url  →  empty media well (--frame)
```

An administrator-set poster wins. `thumbnail_url` remains the automatic
fallback, so nothing regresses for assets nobody has curated. The empty well is
a designed state, not a broken one.

### 4. Type rules

- The **owner** of a poster must be `VIDEO` or `EXTERNAL_VIDEO`.
- The **target** must be `IMAGE`, and `status = READY`.
- `poster_media_id <> id` — an asset cannot be its own poster.

Because a poster target must be an IMAGE and only video rows may hold a poster,
reference cycles are structurally impossible. The self-reference check is a
cheap database-level guard; the type rules are cross-row and belong in the
service (CLAUDE.md §4).

### 5. Poster and letterbox are coupled

Whatever the ingestion pipeline does about baked-in letterbox (an approved
requirement, method unresolved) **must apply identically to a poster and its
video**. An administrator-selected poster that has not been through the same
active-area treatment as its clip reintroduces the scale jump this decision
partly exists to remove.

This is a constraint on the ingestion decision, recorded here so the two are not
designed independently.

## Why

- **Relational, not JSON** — the only shape that participates in
  `MEDIA_IN_USE`, per CLAUDE.md §6 and §12.
- **On `media`, not `block_media`** — matches what a poster *is*, and keeps the
  administrator's work proportional to the library rather than to the number of
  placements.
- **`RESTRICT`, not `SET NULL`** — silently nulling a poster would degrade every
  surface referencing it with no signal. Failing the delete is the behaviour the
  in-use rule already promises everywhere else.
- **Fallback preserved** — making the field nullable with a `thumbnail_url`
  fallback means this is additive: no asset requires curation, but any asset can
  receive it.

## Compatibility impact

No client code exists, so no runtime breakage.

`media.poster_media_id` is **nullable and additive**. Existing rows are valid
unchanged, and the resolution order degrades to today's behaviour when it is
null.

`openapi.yaml` is not contradicted — the `Media` schema simply has no poster
field yet, and `UpdateMediaRequest` has no `posterMediaId`. Both are additions.

## Migration impact

**None applied.** Consistent with ADR-0006 and ADR-0007, this ADR specifies
schema work without applying it.

### Deferred schema work — specified, not applied

1. `media.poster_media_id uuid NULL REFERENCES media(id) ON DELETE RESTRICT`
2. `CHECK (poster_media_id IS NULL OR poster_media_id <> id)`
3. Index on `poster_media_id` — the in-use lookup queries it on every media
   delete.
4. Extend the in-use query to include poster references.

### Deferred contract work

- `Media` DTO gains `poster` — resolved one level only. **A poster's poster is
  never serialised**; nesting is depth-1 by construction since a poster is an
  IMAGE.
- `UpdateMediaRequest` gains `posterMediaId` (nullable, to allow clearing).
- New error condition on `PATCH /media/{mediaId}` for an invalid poster target.

**Apply 0006, 0007 and 0009 in one migration.** Three ADRs now carry unapplied
schema work against the same two tables. Splitting them into three migrations
would mean three passes over `project_blocks` and `media` for one coherent
change set.

## Implementation constraints

1. **Extend the in-use query, or this ADR is not done.** The column alone gives
   referential integrity against hard deletes; the 409 on soft delete is the
   part that matters and it is service-level.
2. **Validate the target type and status in the service**, not the route
   handler (CLAUDE.md §4).
3. **Never accept a poster id through `config`.** If one appears there, it is a
   defect, not an alternative encoding.
4. **The DTO must not recurse.** Serialise the poster as a plain media
   reference; do not resolve a poster's own poster field.
5. **A refused autoplay shows the poster structurally** — the poster sits
   beneath the video and the video fades in over it. Not scripted, so it holds
   when scripting fails.

## Alternatives considered

**Keep `thumbnail_url` only (ADR-0008 §7's deferral).** Rejected by the Project
Owner on the evidence above. The deferral was reasonable when the poster was a
rare fallback; on a media wall it is the dominant state.

**`block_media.poster_media_id` — per placement.** Rejected: multiplies
administrator work by placement count and permits the same clip to present
inconsistently across one page.

**A `media_posters` join table.** Rejected: models a one-to-one relationship as
many-to-many. A nullable column is the correct shape.

**A poster UUID inside `config`.** Rejected: violates CLAUDE.md §6 and defeats
the §12 `MEDIA_IN_USE` guard — the specific failure this decision exists to
prevent.

**`ON DELETE SET NULL`.** Rejected: silently degrades every referencing surface.
The in-use rule promises a 409 elsewhere; posters should not be the exception.
