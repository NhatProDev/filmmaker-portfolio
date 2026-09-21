# ADR-0006 — Responsive Visual Layout Composer

- **Status:** Approved
- **Date:** 2026-09-21
- **Decided by:** Project Owner / Software Architect
- **Amends:** ADR-0004 (supersedes its closed-preset-enum constraint only)
- **Related:** ADR-0002 (ordering), ADR-0005 (insertion), ADR-0007 (page ownership)
- **Affects:** CLAUDE.md §2, §3, §6, §7, §13, §14, §17, §19, §20 · `openapi.yaml` (deferred) · `db/schema.ts` (deferred)
- **Change class:** Builder model change (CLAUDE.md §20)
- **Extended by:** [ADR-0008](0008-multi-video-composition-and-playback-model.md)

> **Extension notice.** ADR-0008 extends this document without contradicting it.
> The GALLERY presentation list in §6 below is **not closed**: ADR-0008 adds a
> fourth mode, `VIDEO_GRID`, for multi-video walls, and defines the video
> playback state model that §6 left unspecified.
>
> This document's decisions stand unchanged, including the GRID/GALLERY
> flow-versus-composition distinction, which ADR-0008 reaffirms. GRID children
> may already be VIDEO blocks, so manual video composition needed no new
> capability here.

## Problem

The Product Owner has locked a requirement that materially expands the builder:
V1 must ship a **Responsive Visual Layout Composer**.

The previous interpretation — a simple ordered block list plus a small fixed set
of layout presets — is no longer sufficient. Three statements in the current
architecture actively block it:

1. **ADR-0004, implementation constraint 1:** "`GRID.config` therefore needs a
   Zod schema with a **closed enum of preset names** — not a free-form object.
   An unknown preset name must be rejected." Under that rule every new
   composition requires a developer to add a preset. The requirement is
   explicitly that the administrator can compose without one.
2. **CLAUDE.md §13:** "Do not implement … **complex per-breakpoint free
   positioning**." The new responsive model requires per-breakpoint overrides.
3. **CLAUDE.md §3 and §19** carried a single undifferentiated "free-form
   Squarespace-style canvas out of scope" line, which conflated *absolute
   positioning* (still forbidden) with *flexible visual composition* (now
   required).

There is also a modelling gap: the requirement's own example places **text
inside a composed GRID**, and the current model cannot express it. A GRID block
holds `block_media` rows, and `block_media.media_id` is `NOT NULL` — so a GRID
can contain media and nothing else.

## Current behaviour before this decision

- `project_blocks` is a flat, ordered list per project. No nesting.
- A GRID's arrangement would come from a preset name in `config`.
- No per-breakpoint layout concept exists anywhere.
- No hide/show, no duplicate.

## Decision

### 1. The model

```text
structured data  +  visual drag-and-drop  +  responsive grid layout
```

Not arbitrary pixel positioning, and not a Figma-style canvas. Both halves of
that sentence are binding.

### 2. GRID becomes a responsive column-composition container

**The closed preset enum from ADR-0004 is superseded.** Placement is expressed
in a logical column system.

- **12 columns** is the desktop conceptual model.
- Valid placement: `colStart >= 1`, `colSpan >= 1`, `colStart + colSpan <= 13`.
- **Presets survive as starting points, not as the only permitted
  configurations** — the same relationship design-direction G5 establishes for
  typography presets.

ADR-0004's *core* decision is unchanged and reaffirmed: asymmetric layouts are
`GRID` configuration, **not** a new block type. The block list stays closed at
seven. Only the preset-only mechanism is replaced.

### 3. Composition uses block nesting, not a new item type

A GRID contains **ordered child blocks**, reusing the existing block model.

- Children may be leaf blocks: HERO, TEXT, IMAGE, VIDEO, SPACER.
- **A GRID may not contain a GRID or a GALLERY.** Nesting depth is exactly one.
- Each child's `config` carries its own placement.
- `block_media` continues to attach media to a leaf IMAGE/VIDEO block, unchanged.

This is what makes text-inside-a-grid expressible. It reuses block types,
ordering, insertion semantics and config validation rather than inventing a
parallel "grid item" concept.

**Page root remains a vertical sequence.** The root is an ordered stack of
blocks; horizontal composition happens inside a GRID. The root is deliberately
not itself a grid — that keeps SPACER meaningful and keeps the common case
simple.

### 4. Placement vocabulary

A grid child may declare: column start, column span, order, alignment, vertical
alignment, gap, width mode, and full-bleed/contained behaviour where applicable.

The exact key names and the full enum of alignment and width-mode values are
**deferred to implementation** (see below). What is locked is that placement is
**logical and column-based**, never pixel coordinates.

### 5. Responsive model

A **fixed** set of three breakpoints: `desktop`, `tablet`, `mobile`.
Administrators cannot create breakpoints.

| Breakpoint | Rule |
|---|---|
| desktop | Explicit composition. |
| tablet | Derives from desktop unless explicitly overridden. |
| mobile | Safe stacking — full width, in `position` order — unless explicitly overridden. |

Derivation is **deterministic**. No arbitrary x/y pixel positions are stored as
the canonical layout model, at any breakpoint.

**Mobile safe-stacking is the guarantee** behind "a layout authored on desktop
must never be broken or unreadable on mobile." Because the mobile default is a
stack rather than a scaled-down desktop composition, neglect produces a readable
page rather than a broken one. An administrator must opt *in* to mobile
complexity.

### 6. GALLERY stays distinct from GRID

Not merged. Different semantics:

- **GALLERY** — media flow: justified mixed-aspect rows, horizontal strips,
  slideshows, native-aspect presentation, reorderable media.
- **GRID** — deliberate composition: columns, unequal spans, asymmetry, mixed
  text and media, controlled responsive placement.

### 7. Ordering — exactly one new concept

Block ordering is scoped to a **container** (page/project root, or a parent
GRID) rather than to a project.

`position` remains a contiguous integer sequence from 0 **within its container**.
Two blocks in different containers may share `position` 0.

ADR-0002's completeness rule becomes "the complete set of blocks **in the target
container**". ADR-0005's insertion semantics apply unchanged, with `N` = sibling
count **within the container**. Media ordering inside a block is untouched.

**Grid placement is not ordering.** `colStart` is visual position; `position` is
document order, and therefore DOM order, keyboard/screen-reader order, and
mobile stack order. Neither is derived from the other.

### 8. Block operations

Create, delete, **duplicate**, reorder, **hide/show**, configure.

- **Duplicate** deep-copies the block, its child blocks and its `block_media`
  *references*. It copies no Media Library asset. It inserts at `position + 1`
  and shifts siblings per ADR-0005, in one transaction.
- **Hide/show** is a visibility concern, not presentation. It is a first-class
  boolean field, **not** a `config` key — public queries must filter on it, and
  §6 keeps `config` to presentation only.

### 9. Layout and theme are orthogonal

Block configuration must carry no colour or typeface values. Theme tokens must
carry no layout values. **Changing the theme must never rewrite block config.**

### 10. Out of scope

Unrestricted absolute x/y positioning; pixel-level canvas placement;
Figma-style freeform canvas; arbitrary z-index editing; arbitrary CSS; arbitrary
custom HTML or JavaScript; arbitrary breakpoint creation; arbitrary external
font injection; arbitrary-HTML or custom-code block types.

## Why

- **Nesting over a new item type.** A "grid item" table or a JSON item list
  would duplicate block types, ordering, insertion and validation. One nullable
  self-referencing FK reuses all of it. It is the smaller architecture.
- **Depth capped at one.** Arbitrary nesting is where block builders become
  unmaintainable and where responsive behaviour stops being predictable. One
  level covers every composition in the visual references.
- **Logical columns over coordinates.** Columns are inherently responsive;
  coordinates are not. This is the single decision that keeps "flexible" from
  becoming "freeform".
- **Mobile defaults to stacking** because the failure mode of the alternative —
  scaling a desktop composition down — is an unreadable page, and the
  requirement forbids exactly that.
- **Hide/show as a column, not config**, because public read paths filter on it.
  A `jsonb` predicate is both less explicit and worse to index.

## Compatibility impact

No client code exists, so no runtime breakage.

`openapi.yaml` is **not contradicted** by this ADR. `CreateBlockRequest.config`
and `UpdateBlockRequest.config` are already `type: object,
additionalProperties: true`, so richer placement configuration validates against
the contract as written. The contract is **incomplete**, not wrong, and is
therefore deliberately left unchanged at this stage.

`db/schema.ts` is likewise not contradicted, but it is **insufficient** — see
"Deferred schema work".

Existing ADRs: ADR-0002 and ADR-0005 remain valid with "container" substituted
for "project" as the sibling scope. ADR-0003 is untouched.

## Migration impact

None yet. Nothing is applied by this ADR.

### Deferred schema work — specified, not applied

When composer implementation begins:

1. **`project_blocks.parent_block_id uuid NULL`**, self-referencing with
   `ON DELETE CASCADE`. A `CHECK` must enforce that a child's type is a leaf
   type, and that a GRID's parent is null — enforcing depth 1.
2. **`project_blocks.is_hidden boolean NOT NULL DEFAULT false`.**
3. Index on `(parent_block_id, position)` alongside the existing
   `(project_id, position)`.
4. The existing contiguity invariant becomes per-container.

Also deferred: the corresponding `openapi.yaml` changes — a `children` array on
the `ProjectBlock` DTO, `parentBlockId` on create, `isHidden` on update, a
duplicate endpoint, and a container scope on the reorder endpoint.

## Implementation constraints

1. **`GRID.config` and grid-child `config` must be explicitly validated per
   block type** (§14). Dropping to a free-form object is forbidden — that is the
   one part of ADR-0004's reasoning that survives fully intact. Replacing a
   closed preset enum with a closed *placement schema* keeps the guarantee.
2. **Validate bounds:** `colStart + colSpan <= 13`; breakpoint keys against the
   closed set; nesting depth; leaf-only children.
3. **Reject unknown keys.** `additionalProperties: false` on the placement
   schema, so a typo fails loudly instead of being silently ignored.
4. **Mobile fallback must be computed, not stored** when no override exists.
   Materialising derived values invites drift between breakpoints.
5. **Deleting a GRID cascades to its children**, and per §12 deletes only
   `block_media` references, never Media Library assets.
6. **Public reads must filter hidden blocks** at every level, including children.

## Alternatives considered

**Keep the closed preset enum and add presets on demand.** Rejected: it is the
exact constraint the Product Owner removed, and it makes every new composition a
developer task.

**A new `grid_items` table.** Rejected: duplicates block types, ordering,
insertion and validation for no gain. Nesting reuses all of it.

**Put grid items in `GRID.config` as a JSON array.** Rejected: §9 of the
requirement and CLAUDE.md §6 both forbid pushing structural relationships into
JSON. Media identity would end up in `config`, which ADR-0004 already ruled out.

**Make the page root itself a 12-column grid.** Rejected as over-engineering:
it complicates the common case, makes SPACER incoherent, and no reference
requires it. GRID blocks provide horizontal composition where it is wanted.

**Arbitrary nesting depth.** Rejected: unbounded responsive complexity, and no
composition in the visual references needs more than one level.

**Store per-breakpoint absolute positions.** Rejected outright by the
requirement, and it is the mechanism by which "flexible" degrades into
"freeform".
