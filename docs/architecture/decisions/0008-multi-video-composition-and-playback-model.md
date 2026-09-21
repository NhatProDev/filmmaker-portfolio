# ADR-0008 — Multi-video composition and playback model

- **Status:** Approved
- **Date:** 2026-09-21
- **Decided by:** Project Owner / Software Architect
- **Extends:** ADR-0006 (adds a fourth GALLERY presentation mode; confirms GRID video children)
- **Related:** ADR-0004 (no media identity in config), ADR-0007 (Home compositions)
- **Affects:** CLAUDE.md §3, §12, §13, §14, §17 · `docs/design/design-direction.md` §8, §9, §11, §14 · `openapi.yaml` (no change) · `db/schema.ts` (no change)
- **Change class:** Builder capability + presentation contract (CLAUDE.md §20)

## Problem

V1 must support media-heavy video surfaces — multiple video previews visible and
playing at once — through two **distinct** capabilities:

1. **Manually composed** video layouts via GRID.
2. **Automatic multi-video flow** via GALLERY.

Three things block this today.

**The GALLERY mode set is incomplete.** ADR-0006 enumerates justified rows,
horizontal strips, slideshows and native-aspect presentation. There is no
video-wall mode.

**Video playback has no contract.** `design-direction.md` §9 carries a
three-row behaviour table (Home hero autoplay-muted-loop; project films
click-to-play with audio; preview video autoplay-muted "where appropriate").
That is design guidance, not a validated model. It names no modes, says nothing
about many videos on one page, and "where appropriate" is not something a
validator can enforce.

**Nothing bounds concurrency.** Nothing prevents a composition from autoplaying
and decoding an unbounded number of videos, which is the specific failure mode a
video wall invites.

## Current behaviour before this decision

- GRID may already contain VIDEO children (ADR-0006) — this half of the
  requirement is **already satisfied**.
- GALLERY has three modes and no video-specific presentation.
- Playback behaviour lives only in prose.
- `media` already carries `thumbnail_url`, `width`, `height`, `duration_ms`,
  `mime_type` and `status`.

## Decision

### 1. Manual video composition belongs to GRID — no new block type

A GRID may contain multiple VIDEO children, alongside IMAGE and TEXT, with the
usual placement vocabulary:

```text
GRID
├── VIDEO A — colStart 1,  colSpan 6
├── VIDEO B — colStart 7,  colSpan 3
├── VIDEO C — colStart 10, colSpan 3
└── TEXT  D — colStart 1,  colSpan 4
```

**No "video-grid block" is introduced for manual composition.** This is already
expressible under ADR-0006 and requires no contract change. Add/drag/reorder/
resize/duplicate/remove come free from the existing composer operations.

### 2. GALLERY gains a fourth presentation mode

```text
JUSTIFIED_ROWS   HORIZONTAL_STRIP   SLIDESHOW   VIDEO_GRID
```

Semantics are locked; **names may be refined before implementation.**

`VIDEO_GRID` is a column-flow media wall configured per breakpoint — for example
4 / 2 / 1 columns across desktop / tablet / mobile.

**VIDEO_GRID is not merged with GRID.** The distinction is load-bearing:

| | |
|---|---|
| **GRID** | deliberate **manual** composition — specific items in specific places |
| **GALLERY / VIDEO_GRID** | **automatic** media flow — a rule arranges a sequence |

A GRID of three videos and a VIDEO_GRID of three videos may render identically;
they are still different capabilities, because one is authored per item and the
other is generated from a rule plus an ordered list.

### 3. Playback is one discriminated state, not a bag of booleans

A single required discriminator:

```text
CLICK_TO_PLAY      AUTOPLAY_VISIBLE      AUTOPLAY_ALWAYS
```

Every autoplay-related flag is **derived from the mode, not stored**:

| Mode | autoplay | muted | playsInline | pauseOffscreen | controls | loop (default) |
|---|---|---|---|---|---|---|
| `CLICK_TO_PLAY` | no | no | yes | n/a | **yes** | no |
| `AUTOPLAY_VISIBLE` | yes | **forced** | yes | **yes** | no | yes |
| `AUTOPLAY_ALWAYS` | yes | **forced** | yes | no | no | yes |

This makes the forbidden combinations **unrepresentable** rather than merely
invalid: there is no way to express `CLICK_TO_PLAY + autoplay`, and no way to
express audible autoplay, because `muted` is not an input in autoplay modes.

Independently configurable, and nothing else:

```text
playback.mode      required, the enum above
playback.loop      optional, defaults by mode
playback.controls  optional, VALID ONLY when mode = CLICK_TO_PLAY
fit                optional, CONTAIN | COVER
```

`autoplay`, `muted`, `playsInline`, `preload` and `pauseWhenOffscreen` are
**not** configuration fields. Accepting them as input would reintroduce exactly
the conflicting-boolean problem this model exists to remove.

**Mode applicability:**

- `CLICK_TO_PLAY` — primary project film; any video where audio is part of the
  intended experience.
- `AUTOPLAY_VISIBLE` — **the default for every multi-video surface**: video
  grids, walls, work previews, background previews, horizontal video strips,
  VIDEO children of a GRID, media-heavy Home compositions.
- `AUTOPLAY_ALWAYS` — exceptional, standalone ambient video only.

### `AUTOPLAY_ALWAYS` is restricted by context, not by count

An earlier formulation of this rule — "never the default on a page containing
many videos" — was **unenforceable**. It required counting videos per page,
which is not something a validator can do reliably at the point a block is
saved, and it left the boundary to judgement.

It is replaced by a **structural rule about where the mode may appear**, which
is decidable from the block being validated alone:

`AUTOPLAY_ALWAYS` is permitted **only** on a small standalone ambient surface —
a single Home hero, or a standalone ambient VIDEO block.

It **must not** be used:

- by a VIDEO item **inside a GRID**
- by a **GALLERY**, in any presentation mode
- by **`VIDEO_GRID` items**
- as an **inherited block or gallery default** for any multi-item media surface

Multi-video compositions use `AUTOPLAY_VISIBLE` or `CLICK_TO_PLAY`, as
appropriate.

This is machine-validatable: the container is known when the block is validated.
A VIDEO block with a parent, or any playback default on a GALLERY, is rejected
if its mode is `AUTOPLAY_ALWAYS` — no page-wide analysis required.

The restriction also holds through **inheritance**. A GALLERY cannot set
`AUTOPLAY_ALWAYS` as its default and have items inherit it, because the default
itself is rejected at the container.

### 4. Where playback configuration lives

A **combination**, with a strict precedence chain:

```text
per-item override  (block_media.config)
  > block default  (project_blocks.config)
    > mode default (system)
```

- A **VIDEO block** holds its own playback in `project_blocks.config`.
- A **GALLERY** holds the wall's default playback in `project_blocks.config`, so
  twenty tiles do not each repeat the same mode.
- **`block_media.config`** carries per-item overrides, and only for
  `playback.mode`, `playback.loop` and `fit`. It is not a second full config.

This is what makes "one feature film plus a wall of silent loops on the same
page" expressible — the requirement in §10 of the brief that the primary film
and ambient loops must not share a playback behaviour.

### 5. Autoplay safety — non-negotiable

- Muted by default and **forced** muted in both autoplay modes.
- `playsInline` always.
- **No public page may initiate audible playback.** Audio requires a deliberate
  user act.
- Autoplay must be treated as a request that may be **refused**. The
  implementation must not assume it succeeded; a refused autoplay falls back to
  the poster frame, not to a blank or broken tile.
- **`prefers-reduced-motion` produces a deterministic still**: a paused poster
  frame or still cover. Not a shortened animation, not a slowed loop.

### 6. Performance — a system bound, not an admin setting

Locked:

- Off-screen videos **must not** continue consuming playback resources in
  `AUTOPLAY_VISIBLE`.
- A video grid **must not** naïvely autoplay or decode an unbounded number of
  videos.
- Performance must remain acceptable on desktop **and** mobile.

The runtime strategy is a three-state lifecycle — **visible: play · near
viewport: prepare · far: pause and release** — with the mechanism deliberately
unspecified. `IntersectionObserver` is a plausible implementation and is
**explicitly not locked into the architecture**.

**No configurable concurrency or preload policy in V1.** The concurrency cap is
a system constant, not an administrator setting. Exposing it would let an
administrator degrade the page, and would be a setting nobody can reason about.
If a future need proves otherwise, that is a new ADR.

`VIDEO_GRID` column counts are **bounded by validation** at every breakpoint.
The exact maximum is deferred to design exploration, but a maximum must exist —
column count is the one admin-facing control that directly multiplies decode
load.

### 7. Poster frames — never a media id in config

`media.thumbnail_url` is the poster source for V1. No new field, no new
relationship.

**A poster must never be stored as a media UUID inside `config`.** Two existing
rules forbid it:

- CLAUDE.md §6 — "Do not move canonical media relationships into JSON config."
- CLAUDE.md §12 — media deletion must fail with `409 MEDIA_IN_USE` while the
  asset is referenced. The in-use check inspects `projects.cover_media_id` and
  `block_media.media_id`. **A reference hidden in JSON is invisible to it**, so
  the poster would be deletable and every tile referencing it would break.

**Deferred enhancement — administrator-selected poster media.**

`thumbnail_url` is sufficient for V1, but this is recorded as a known
enhancement rather than a closed question, because **poster quality matters more
here than it would on a page with one video**. Three surfaces fall back to the
poster:

- every tile in a video wall before it enters the viewport
- every tile when autoplay is **refused** by the browser
- every tile under `prefers-reduced-motion`

On a wall, that means the poster *is* the composition much of the time. An
auto-generated first frame may be a black frame, a slate, or a mid-motion blur —
any of which reads as broken rather than composed.

When it is taken up, the shape is a relational `media.poster_media_id`
self-reference with the §12 in-use check extended to cover it. **The future
schema is not designed here**, and it must not be approximated by putting a
media id in `config` — see above.

### 8. GALLERY media types — mixed is permitted

**GALLERY may contain IMAGE and VIDEO together.** Presentation mode determines
whether mixing is *sensible*, not whether it is *permitted*.

`VIDEO_GRID` is video-focused but **does not reject images**. An image in a
video wall renders as a still tile in the same cell geometry. There is no
rendering reason to forbid it, so it is not forbidden.

**`EXTERNAL_VIDEO` is the real restriction.** The `media_type` enum is
`IMAGE | VIDEO | EXTERNAL_VIDEO`, and an external provider embed is an iframe:
autoplay, muting, pausing and poster control are provider-dependent, and the
performance profile is far worse than a self-hosted file.

Therefore: **`EXTERNAL_VIDEO` supports `CLICK_TO_PLAY` only.** Assigning it an
autoplay mode is a validation error, not a best-effort attempt. This restriction
falls directly out of the existing media model and is not negotiable by config.

### 9. Responsive behaviour

Unchanged from ADR-0006 and applied to video:

- **GRID** — desktop composes explicitly; tablet derives or simplifies; mobile
  safe-stacks unless overridden.
- **GALLERY / VIDEO_GRID** — column and flow behaviour may differ per breakpoint
  through validated settings.
- The same closed breakpoint set. **No arbitrary breakpoint creation. No
  absolute x/y positioning.**

Mobile deserves an explicit note: a wall that is four columns on desktop and
still four on mobile is both unreadable and a decode disaster. Column counts
must fall at narrower breakpoints.

### 10. Theme remains orthogonal

No typography, palette or brand colour inside playback, gallery-mode, grid
placement or media-ordering configuration. Changing the theme must not touch any
of it.

## Why

- **A discriminated mode makes invalid states unrepresentable.** The brief asked
  for no conflicting booleans; deriving the flags is stronger than validating
  combinations of them, because there is nothing left to validate.
- **Block default plus per-item override** is the smallest model that supports
  both a uniform wall and a deliberate exception, without repeating a mode
  across every item.
- **GRID already does manual composition**, so introducing a video-grid block
  for it would duplicate the composer for one media type.
- **Keeping VIDEO_GRID inside GALLERY** preserves the flow-versus-composition
  distinction that ADR-0006 established, rather than creating a third category
  that is neither.
- **A system concurrency cap, not a setting**, because the administrator cannot
  reason about decode budgets and should not be handed a control that breaks the
  page.
- **Posters via `thumbnail_url`** avoids both a schema change and a class of
  dangling-reference bug that the existing in-use rule would not catch.

## Compatibility impact

No client code exists, so no runtime breakage.

**`openapi.yaml` requires no change.** `CreateBlockRequest.config`,
`UpdateBlockRequest.config`, `AddBlockMediaRequest.config` and
`UpdateBlockMediaRequest.config` are all `type: object,
additionalProperties: true`. Richer playback and gallery configuration validates
against the contract as written. The contract is **permissive and incomplete**,
not contradicted, and is deliberately left unchanged.

**`db/schema.ts` requires no change.** Every element of this decision fits
existing columns:

| Need | Existing home |
|---|---|
| Block playback default, gallery mode, column counts | `project_blocks.config` (jsonb) |
| Per-item playback override, fit | `block_media.config` (jsonb) |
| Media ordering within a wall | `block_media.position` |
| Poster frame | `media.thumbnail_url` |
| Aspect ratio | derived from `media.width` / `media.height` |
| Duration, mime type, readiness | `media.duration_ms`, `mime_type`, `status` |

**No new table.** Playback flags are presentation configuration, and creating a
table to hold them would be exactly the over-modelling the brief warns against.

## Migration impact

**None.** No schema change is applied or required by this ADR.

Deferred and specified, should they later be wanted:

1. `media.poster_media_id` — relational, for administrator-selected posters,
   with the §12 in-use check extended. Not JSON.
2. Video renditions / HLS variants, if adaptive streaming is introduced. That is
   a transcoding-pipeline decision, out of scope here.

## Implementation constraints

1. **`playback` must be validated per block type**, with
   `additionalProperties: false`. A typo must fail loudly.
2. **Reject `controls` unless `mode = CLICK_TO_PLAY`.** Do not silently ignore
   it.
3. **Reject any autoplay mode on `EXTERNAL_VIDEO` media** (§8).
4. **Reject `AUTOPLAY_ALWAYS` outside a standalone ambient VIDEO block** — that
   is, on any VIDEO with a parent block, on any GALLERY default, and on any
   `VIDEO_GRID` item. Validate from the block's container, never by counting
   videos on a page.
4. **Never accept `autoplay`, `muted`, `playsInline` or `pauseWhenOffscreen` as
   input.** They are derived. Accepting-and-ignoring is worse than rejecting.
5. **Bound `VIDEO_GRID` column counts** at every breakpoint.
6. **Poster must resolve without a config lookup** — `media.thumbnail_url` only.
7. **A refused autoplay must show the poster**, never an empty tile.
8. **Reduced-motion is checked before playback starts**, not after.
9. **Hidden blocks (ADR-0006) must not preload or decode.** A hidden video wall
   costs nothing.

## Alternatives considered

**A dedicated `VIDEO_GRID` block type.** Rejected: the block list is closed
(CLAUDE.md §13), and this is a GALLERY presentation mode, not a new content
structure.

**Boolean flags — `autoplay`, `muted`, `loop`, `controls` — with cross-field
validation.** Rejected: the brief explicitly asked for a small state model, and
validation of combinations is strictly weaker than making bad combinations
unrepresentable.

**Per-item playback only, with no block default.** Rejected: a twenty-tile wall
would repeat the same mode twenty times, and changing the wall's behaviour would
mean twenty writes.

**Block-level playback only, with no per-item override.** Rejected: §10 of the
brief requires a primary film and ambient loops to coexist with different
behaviour on one page.

**An admin-configurable concurrency/preload budget.** Rejected as
over-engineering and as a footgun. A system constant is safer and simpler; the
brief said to identify the need, not invent the control.

**Storing `posterMediaId` in `config`.** Rejected: violates CLAUDE.md §6 and
silently defeats the `MEDIA_IN_USE` guard in §12.

**Forbidding images inside `VIDEO_GRID`.** Rejected: no rendering reason
requires it, and the brief said not to restrict without one.
