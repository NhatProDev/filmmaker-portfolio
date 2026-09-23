# ADR-0013 — Templates, typed blocks and presentation presets

- **Status:** Approved
- **Date:** 2026-09-24
- **Decided by:** Project Owner / Software Architect (Phase 2 architecture report, with Director clarifications)
- **Related:** ADR-0006 (composer), ADR-0007 (page ownership), ADR-0008 (playback), ADR-0010 (HERO overlay), ADR-0011 (block content)
- **Affects:** CLAUDE.md §7, §13, §14 · `db/schema.ts`
- **Change class:** Builder model change (CLAUDE.md §20)

## Problem

Project Detail and Home are composer-driven, but the locked pages are
hand-tuned: their responsive behaviour includes measured, page-specific
derivations (the 4 / 2 / 1 stills grid, the caption that stacks under 906px,
Home's 3 / 2 wall with its lone-tail rule). A generic renderer driven only by
column data would not reproduce them, and storing their CSS in the database
would violate §13.

## Current behaviour before this decision

ADR-0006 locked the block model and allowed presets as starting points, without
saying what a preset owns.

## Decision

### 1. Hybrid

| Layer | Decision |
|---|---|
| **Typed blocks** | The persistent content: the seven block types of ADR-0006, a 12-column logical grid, one nesting level. |
| **Templates** | Seed block trees copied when a project is created. **Not live-linked**: changing a template never changes an existing project, so templates never need data migrations. |
| **Presentation presets** | A **closed, code-defined** set of responsive recipes, selected by name in `config`. A preset owns the page-specific derivations; the data only names it. |
| **Custom placement** | Still available per ADR-0006 (column start/span per breakpoint) with the generic derivation rules. |

Mobile safe stacking remains **derived in code** and is never stored. There is
no freeform canvas, no absolute positioning and no z-index authoring. The
drag-and-drop composer UI is not part of this decision's implementation.

### 2. Initial preset set

Closed, and each preset is today's locked CSS:

| Block | Presets |
|---|---|
| GRID | `projectMeta`, `projectStills`, `projectLoop`, `projectCredits`, `homeIdentity`, `homeAbout` |
| GALLERY (`VIDEO_GRID`) | `homeWall` |
| IMAGE | `projectCoda` |

Adding a preset is a code change with review, never an administrator action.

### 3. Structural enforcement

- **Exactly one owner, strictly.** A root block names exactly one of project or
  page and has no parent; a child names only its parent. ADR-0007 §2's
  illustrative SQL would also admit a child that names a project, which makes
  its container ambiguous; the strict form is what ADR-0007's prose ("exactly
  one owner") and its implementation constraint 2 require, and is what the
  schema implements.
- **Leaf-only children** by `CHECK`; that a parent is a GRID is a cross-row rule
  and is checked in the service (CLAUDE.md §4).

### 4. Rendering before the generic renderer exists

Until a generic block renderer replaces the hand-built pages, the public
database adapter **projects** a stored block tree into the existing page view
models. A composition the locked page cannot render — an unknown preset, blocks
in an order the page cannot show, content the view model cannot hold — is an
**error**, never silently reordered or dropped.

## Why

- Presets keep the locked designs exact while the data stays free of CSS.
- Seed templates give fast starts with zero migration cost.
- Projection with refusal keeps the public site correct during the transition.

## Compatibility impact

Additive. ADR-0006 stands; this defines what its presets are.

## Migration impact

None beyond the schema work already specified by ADR-0006 and ADR-0007, applied
in migration `0002`.

## Implementation constraints

1. Preset names are a closed enum; unknown names are rejected.
2. No CSS value, pixel coordinate, colour or typeface in `config`.
3. Mobile layout is derived, never stored.
4. The projection refuses what the locked page cannot render.

## Alternatives considered

**A generic renderer only.** Rejected for now: it would drift from the locked
pages.

**Templates as live links.** Rejected: every template change would become a data
migration.

**Store per-page CSS in `config`.** Rejected: §13.
