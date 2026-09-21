# ADR-0004 — Asymmetric layouts are GRID configuration, not a block type

- **Status:** Approved — **partially amended by [ADR-0006](0006-responsive-visual-layout-composer.md)**
- **Date:** 2026-09-21
- **Decided by:** Project Owner / Software Architect
- **Affects:** CLAUDE.md §13 · `block_type` enum · `project_blocks.config`
- **Change class:** Resolves a conflict between human product intent and locked architecture

> **Amendment notice.** ADR-0006 supersedes exactly one clause of this document:
> **implementation constraint 1**, which required `GRID.config` to be validated
> against a *closed enum of preset names*. GRID is now a responsive
> column-composition container, and presets are starting points rather than the
> only permitted configurations.
>
> **Everything else here stands and is reaffirmed** — most importantly the core
> decision that asymmetric layouts are `GRID` configuration and **not** a new
> block type, the closed seven-type block list, and constraint 1's underlying
> principle that `GRID.config` must never be a free-form object. ADR-0006
> replaces the closed *preset enum* with a closed *placement schema*; it does not
> relax validation.
>
> The text below is preserved unedited as the record of the original decision.

## Problem

`docs/human-description/description.md` lists the V1 builder's structured layout
blocks as:

> hero media, text, image, video, gallery, image grid, spacer,
> **asymmetric layout presets**

That is eight items. The locked architecture defines seven block types, in both
CLAUDE.md §13 and the `block_type` PostgreSQL enum:

```text
HERO, TEXT, IMAGE, VIDEO, GRID, GALLERY, SPACER
```

"Asymmetric layout presets" had no corresponding type. Left unresolved, an
implementer reading the human description would reasonably conclude a block type
was missing and add one — a `block_type` enum change, which is a database
relationship redesign under CLAUDE.md §20 and requires approval.

This is not a throwaway line in the brief. Reference `4. Works.png` shows a
project page built from exactly this: a full-bleed video, an offset dark panel
carrying title, a small thumbnail cluster and body copy, then a second video
deliberately out of alignment with the first. Reference `2. About me.png` shows
the same intent applied to a photo collage. Asymmetry is a stated design quality
(CLAUDE.md §21), not an afterthought.

## Current behaviour before this decision

The `block_type` enum contained seven values. `project_blocks.config` is
`jsonb NOT NULL DEFAULT '{}'`, typed in Drizzle as
`BlockConfig = Record<string, unknown>`, and CLAUDE.md §6 states it holds
"presentation configuration only".

Nothing expressed asymmetric layout, and nothing recorded that its absence was
deliberate.

## Decision

**Do not add a block type.** The canonical list stays closed at seven:

```text
HERO, TEXT, IMAGE, VIDEO, GRID, GALLERY, SPACER
```

Asymmetric layouts are expressed as **named layout presets inside
`GRID.config`** — presentation configuration, which is what
`project_blocks.config` is for.

CLAUDE.md §13 now states this explicitly, so the conflict does not resurface.

## Why

- Asymmetry is a **presentation** concern, not a distinct content structure. A
  `GRID` block holds an ordered set of `block_media` rows either way; only the
  arrangement differs. That is precisely the boundary CLAUDE.md §6 draws when it
  says `config` holds presentation configuration and canonical media
  relationships must not move into JSON.
- Adding a block type would require a `block_type` enum migration plus a new
  renderer, validator and builder affordance, to express something the existing
  `GRID` block already stores correctly.
- Presets keep §13's constraint intact: layout stays "constrained and
  responsive", and the builder does not drift toward the arbitrary
  absolute-position canvas that §3 and §19 place out of scope. A fixed set of
  named presets is the opposite of free-form positioning.
- Adding presets later is additive and needs no migration. Removing a
  wrongly-added enum value later would need one.

## Compatibility impact

None. No schema change, no contract change, no enum change.

`CreateBlockRequest.config` and `UpdateBlockRequest.config` are already
`type: object, additionalProperties: true`, so preset-bearing configs validate
against the current contract as written.

## Migration impact

None.

## Implementation constraints

These are binding on whoever implements the builder:

1. CLAUDE.md §14 requires block configuration to be **validated by block type**.
   `GRID.config` therefore needs a Zod schema with a closed enum of preset
   names — not a free-form object. An unknown preset name must be rejected.
2. Preset names are presentation identifiers. Do not encode media identity,
   ordering or relationships in them; ordering stays in
   `block_media.position` per §6 and §7.
3. Every preset must be responsive per §13. A preset that only works at one
   breakpoint is not admissible.
4. The concrete preset list is a **design** decision, governed by CLAUDE.md §21.
   It is not settled here and must not be invented during implementation. It
   follows the approved design specification, which per architect decision Q13
   will not be authored until the external design guideline has been imported
   and reviewed alongside the visual references.

## Alternatives considered

**Add an `ASYMMETRIC` block type.** Rejected: a `block_type` enum change is a
§20 contract change, and it duplicates `GRID`'s storage model to express a
presentation variant.

**Add a generic `LAYOUT` block type wrapping other blocks.** Rejected: nested or
container blocks are a structural change to the block model, and §5 warns
against generic abstractions before two real consumers justify them. One
speculative consumer is not two.

**Leave `GRID.config` free-form and let the builder emit whatever it likes.**
Rejected: violates §14's requirement to validate config shape by block type, and
would let the builder drift into free-form positioning through the back door.

**Drop "asymmetric layout presets" from the brief as unbuildable.** Rejected:
the intent is legitimate, evidenced by references 2 and 4, and is one of the
design qualities CLAUDE.md §21 requires the build to preserve. Only the
mechanism changes.
