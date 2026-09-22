# ADR-0010 — Bounded project HERO title overlay

- **Status:** Approved
- **Date:** 2026-09-22
- **Decided by:** Project Owner / Software Architect
- **Extends:** [ADR-0006](0006-responsive-visual-layout-composer.md)
- **Related:** [ADR-0008](0008-multi-video-composition-and-playback-model.md) (playback modes, `EXTERNAL_VIDEO`), [ADR-0009](0009-administrator-selected-poster-media.md) (poster resolution)
- **Affects:** CLAUDE.md §13, §14, §17 · `docs/design/design-system.md` · `docs/design/page-specifications.md` · `openapi.yaml` (no change) · `db/schema.ts` (no change)
- **Change class:** Composer capability + validation contract (CLAUDE.md §20)

> **Scope of this approval.** This approves the **architecture capability** only.
> It does **not** approve Project Detail 1B v2 as final visual design, and it
> does not promote `design-direction.md`, `design-system.md` or
> `page-specifications.md` out of Draft.

## Problem

The Project Detail candidate baseline opens directly into the film: the HERO
carries the film **and the film's name**, and everything that has to be read
sits below it. The site's signature light-to-dark transition hands a frame off
from a browsing surface into the project page, and that frame should already
carry the project's name when it lands. A title that arrives afterwards as a
separate event loses the handoff.

The current contract cannot express this. CLAUDE.md §13 lists HERO as a
canonical block with no overlay-content concept, and ADR-0006's placement
vocabulary positions blocks **in a grid**, not **within another block's frame**.

The legal alternative — a TEXT block immediately after the HERO — is available
today and needs no contract change. It was built and reviewed alongside the
overlay (`docs/design/prototypes/project-detail/Project Detail 1B v2.dc.html`,
`titleMode: stacked`). It works; it costs the transition.

## Current behaviour before this decision

HERO is a **leaf** block (ADR-0006 §3). It carries media through `block_media`
and presentation configuration through `project_blocks.config`. It has no
internal composition concept of any kind.

`design-system.md` §5.5 separately **defers** an overlap primitive — two GRID
children on one row with overlapping column ranges and a bounded two-layer
stacking order — and notes "the hero works without it."

## Decision

**HERO gains a bounded, intra-block title-overlay presentation capability.**

### 1. This is intra-block presentation, not nesting and not overlap

Stated in terms, because it will otherwise be misread:

- **This is not block nesting.** HERO remains a **leaf** block under ADR-0006
  §3. No child block is created, stored or rendered. The overlay is a
  presentation region of the HERO block itself, composited inside that block's
  own frame.
- **This is not the deferred overlap primitive.** `design-system.md` §5.5 defers
  **inter-child** overlap — two GRID *siblings* overlapping, which requires the
  layout engine to author stacking order between independent blocks. **That
  deferral is untouched and is not reopened by this ADR.** The capability
  approved here is *intra-block*: one block, its own frame, a fixed two-layer
  order set by the system.
- **This is not a layer editor.** There is exactly one text region and one
  optional navigation line. Anything beyond that is out of scope (CLAUDE.md
  §13).

No block type is added. The canonical list stays closed at seven.

### 2. The overlay authors no content

**The overlay must not carry an authored title field.** A `title: "…"` key in
block configuration — or any equivalent authored text field — is **rejected**.

| Element | Source |
|---|---|
| Project title | **`projects.title`**, resolved relationally at render |
| Navigation line | **System / route-derived** (e.g. "Back to Works") |
| Anything else | **Not permitted** |

This follows CLAUDE.md §6: `config` holds presentation configuration only, and
canonical relationships and content do not move into JSON. The overlay therefore
introduces **no new content model at all** — it is a presentation flag over data
that already exists.

**No body copy. No arbitrary authored text. No second independent text region.**
The working rule the capability encodes: the overlay may carry the project's
name and one navigation line, and nothing that has a reading measure. Year,
runtime, client, role, statement and credits all belong below the frame.

A HERO that is **not** owned by a project has no title to resolve. The overlay
is therefore valid only on a project-owned HERO; see §7.

### 3. Bounded configuration

Only presentation configuration. Conceptually:

```text
HERO.config.overlay
  enabled             boolean
  anchor              closed enum
  colStart / colSpan  existing 12-column placement vocabulary (ADR-0006 §2)
  showBackToWorks     boolean
```

Exact key names follow repository conventions and are settled at
implementation. What is **locked** is the shape: a closed object, logical column
placement, an anchor from a closed set, and no content.

**Derived by the system, never authored:**

scrim · typography · colour · z-order · dismissal behaviour · responsive
fallback.

**Explicitly not permitted:**

arbitrary x/y coordinates · arbitrary nested blocks · arbitrary HTML · custom
CSS · z-index authoring · authored colour values · authored typefaces ·
body-copy regions · multiple independent text regions.

The scrim is **functional, not decorative**: it exists to hold contrast over
unknown footage. Because it is derived rather than authored, CLAUDE.md §13's
rule that block configuration carries no colour value holds without exception,
and changing the theme cannot rewrite block configuration.

### 4. Media activation

Dismissal is defined against **media activation** — the deliberate user act that
starts the media — and **not** against an observed "playback has begun" event.
Provider embeds do not reliably emit one, and a hosted `play` event is a weaker
guarantee than the act that caused it. Binding behaviour to the act makes the
rule decidable in every case.

**Hosted video, `CLICK_TO_PLAY`:**

| Phase | Behaviour |
|---|---|
| Idle | Poster / idle media · title overlay visible · play affordance visible |
| On media activation | Title overlay, scrim and custom play affordance are dismissed; playback begins |

**`EXTERNAL_VIDEO`:** the site cannot observe provider playback state. Therefore
on media activation the overlay is **dismissed first**, and the provider embed
is then activated or handed off. **No behaviour may depend on a provider
playback event.** `EXTERNAL_VIDEO` remains `CLICK_TO_PLAY` only (ADR-0008 §8).

**IMAGE HERO:** there is no activation and no playback state. **The overlay
remains visible.** This is a designed state, not a fallback.

**Autoplay modes:** the bounded title overlay is **not valid** for
`AUTOPLAY_AMBIENT` or `AUTOPLAY_VISIBLE`. Its moving-film use is limited to
`CLICK_TO_PLAY`. An autoplaying surface has no idle state to hold a title over
and no user act to dismiss it, so the capability has no meaning there.

Hero chrome must be computed in **one place** from its inputs — overlay
configuration and activation state — so a re-render cannot resurrect a dismissed
overlay.

### 5. Interaction safety

The overlay **must never obstruct**:

- the primary play affordance
- browser or native transport controls
- provider controls
- any required focus target

The navigation line is a focusable control and **must carry a valid, visible
accessible focus state** (`design-system.md` §12). It is a line of type, not a
button: it takes an underline rather than a colour to distinguish it, since
colour may not be the sole carrier of meaning.

DOM order continues to follow `position`, never visual placement.

### 6. Responsive behaviour

The architecture **must** provide a safe derived fallback.

- Desktop and tablet may render the bounded in-frame overlay where it is valid.
- At sufficiently narrow widths the system **derives** a stacked presentation:
  the HERO, then the project title and navigation line in document flow beneath
  it.

**The fallback is derived, not authored.** A second mobile composition must
**not** be stored inside HERO configuration — that would be an arbitrary
per-breakpoint composition, which ADR-0006 §5 and CLAUDE.md §13 exclude. This
matches ADR-0006's existing rule that mobile fallback is computed, not stored.

**The exact breakpoint and the exact stacked treatment remain subject to mobile
design validation.** This ADR fixes that a safe fallback must exist and what
shape it takes, not its visual detail.

### 7. Where the capability is valid

Valid only where **all** of the following hold:

1. The block is a **HERO**.
2. The HERO is **project-owned**, so `projects.title` resolves.
3. Its media is an `IMAGE`, or a video whose playback mode is `CLICK_TO_PLAY`.

Anything else is a validation error, not a best-effort render.

## Why

- **It adds no content model.** The title is already a relational column. The
  capability is a presentation flag over existing data, which is the smallest
  possible footprint and the reason it fits CLAUDE.md §6 without an exemption.
- **Text inside a media frame is already an admitted pattern.**
  `design-system.md` §15 pattern 7 defines a media caption — "inside the frame,
  on the footage." This is the same class of object at a different scale with a
  relational source, not a new concept.
- **Media activation is decidable; playback state is not.** Defining dismissal
  against the user act rather than an observed event gives one rule that holds
  for hosted video and provider embeds alike, instead of a reliable path and a
  best-effort path.
- **Deriving scrim, colour, typography and z-order** keeps layout and theme
  orthogonal, and makes the forbidden states unrepresentable rather than merely
  invalid — the same technique ADR-0008 used for playback flags.
- **Restricting to `CLICK_TO_PLAY`** follows from the capability's own meaning
  rather than from a separate rule: an autoplaying surface has no idle state to
  hold a title over.
- **Option B remains legal.** A TEXT block after the HERO needs no contract
  change and stays available. This ADR adds a capability; it removes none.

## Compatibility impact

No client code exists, so no runtime breakage.

`openapi.yaml` is **not contradicted and needs no change**.
`CreateBlockRequest.config` and `UpdateBlockRequest.config` are already
`type: object, additionalProperties: true`, so overlay configuration validates
against the contract as written. The contract is **permissive and incomplete**,
not wrong — the same posture recorded by ADR-0006 and ADR-0008.

`db/schema.ts` is **not contradicted and needs no change**. The overlay lives in
the existing `project_blocks.config` jsonb column. No column, no enum value, no
table, no relationship.

ADR-0006 is **extended, not amended**. Its leaf-block rule, nesting depth,
column model, breakpoint set and derivation rules all stand unchanged.

`design-system.md` §5.5's deferred inter-child overlap primitive is **untouched
and remains deferred**.

## Migration impact

**None.** No schema change is applied or required by this ADR. It adds no entry
to the deferred-schema set carried by ADR-0006, ADR-0007 and ADR-0009.

## Implementation constraints

1. **Validate `HERO.config` per block type with `additionalProperties: false`.**
   The overlay object is closed; an unknown key fails loudly (ADR-0006
   implementation constraint 3).
2. **Reject any authored title or text field** in overlay configuration. If one
   appears, it is a defect, not an alternative encoding.
3. **Reject the overlay** on a non-HERO block, on a HERO that is not
   project-owned, and on any video HERO whose mode is not `CLICK_TO_PLAY`.
4. **Validate `anchor` against the closed enum** and column placement against
   the existing bounds — `colStart >= 1`, `colSpan >= 1`,
   `colStart + colSpan <= 13`.
5. **Reject authored colour, typeface, opacity, z-index and coordinate values.**
6. **Compute hero chrome in one place** from overlay configuration and
   activation state, so a re-render cannot resurrect a dismissed overlay.
7. **Dismiss before handing off to a provider embed**, and depend on no provider
   playback event.
8. **Derive the narrow-width stacked fallback**; do not store it.
9. **The overlay must not capture pointer events** intended for the play
   affordance or any transport control.

## What this ADR does not decide

- **The poster / film `fit` contract remains open.** This ADR does **not**
  choose between `COVER` idle → `COVER` playback, `CONTAIN` idle → `CONTAIN`
  playback, or `COVER` idle → `CONTAIN` playback. See `design-system.md` §16 and
  `page-specifications.md` §3.9 item 2.
- **Letterbox handling is unchanged:** requirement approved, method unresolved
  (`design-system.md` §7.5, §16 item 1).
- **Focal point remains deferred** (`design-system.md` §7.6).
- **Project Detail 1B v2 is not approved as final visual design.** Its
  composition remains a candidate, and the design documents remain Draft.
- **The exact mobile breakpoint and stacked treatment** await visual validation.

## Alternatives considered

**Option B only — a TEXT block after the HERO.** Rejected as the sole answer,
but **retained as legal**. It is architecturally free and visually honest, and
it loses the transition: the frame that flew in from the browsing surface lands
on an anonymous rectangle and the title arrives as a separate event.

**A generic block-overlap or nesting capability.** Rejected. It would reopen the
deferred §5.5 primitive, make HERO a container, and turn the composer into a
layer editor — which CLAUDE.md §13 places out of scope.

**An authored `title` field in overlay config.** Rejected: it duplicates
`projects.title`, puts content in `config` against CLAUDE.md §6, and creates two
sources of truth for one string that would silently diverge on rename.

**Binding dismissal to a `play` event.** Rejected: unavailable for
`EXTERNAL_VIDEO`, and weaker than the user act even where available. It would
produce one reliable path and one best-effort path for the same rule.

**Allowing the overlay on autoplay surfaces.** Rejected: no idle state to hold a
title over and no user act to dismiss it. The restriction falls out of the
capability's meaning rather than being imposed on it.

**Storing a separate mobile overlay composition.** Rejected: an arbitrary
per-breakpoint composition, excluded by ADR-0006 §5 and CLAUDE.md §13. The
fallback is derived.
