# Design System — Filmmaker Portfolio V1

- **Status:** Draft — derived from a candidate handoff. **Not approved.**
- **Date:** 2026-09-22
- **Derives from:** `design-direction.md` (Draft), `design-handoff.md` (candidate
  visual evidence, not approved), ADR-0004, ADR-0006, ADR-0007, ADR-0008,
  ADR-0009, CLAUDE.md §13, §21
- **Precedence:** Becomes part of Tier 1 **only on explicit Project Owner /
  Software Architect approval** (CLAUDE.md §21). Until then it does not outrank
  the visual references or human product intent.

This document defines the system-level rules. Page-level composition lives in
`page-specifications.md`.

---

## 0. How to read this document

Every rule carries a grade. **The grade is part of the rule.** Do not promote a
rule by quoting it without its grade.

| Grade | Meaning | Changing it |
|---|---|---|
| **[INVARIANT]** | Backed by CLAUDE.md or an approved ADR. Holds under every theme and every composition. | Requires a §20 contract change |
| **[DEFAULT]** | An approved starting value. Correct until deliberately changed within the invariants. | Administrator or designer may change it |
| **[ADVISORY]** | Evidence from design exploration. Review guidance, **never validated in code**. | Judgement, per composition |

Design exploration produced findings, not authority. `design-handoff.md` states
this itself: a test finding does not become specification by being written down.
Findings appear below as **[DEFAULT]** or **[ADVISORY]** only — never as
**[INVARIANT]** — unless an approved ADR already carried the rule independently,
or the rule is independently derivable without the prototype.

### 0.1 Evidence status — the prototype has been recovered

`design-handoff.md` cites two evidence sources:

```text
Home Baseline.dc.html   "source of truth for the visuals"
home-baseline.md        "test findings and their evidence"
```

**Both are now present**, at `docs/design/prototypes/home/legacy/`. They were
absent when this section was first written. **The grading consequences recorded
below were applied then and still hold** — recovery does not re-promote
anything.

Two tiers of Home evidence now exist:

| Tier | Artifacts | Standing |
|---|---|---|
| **Current candidate** | `prototypes/home/Home Baseline v2.dc.html` · `home-baseline-v2.md` | Candidate evidence. **Not approved.** |
| **Historical** | `prototypes/home/legacy/Home Baseline.dc.html` · `legacy/home-baseline.md` | Superseded. Retained as record. |

Consequence for grading, unchanged:

- **A measurement that cannot be re-derived is not a specification.** The legacy
  frame rates, the reported ~12% poster/video scale jump and the letterbox bar
  dimensions remain **historical**. Recovering the file that reported them does
  not verify them; only re-measurement does.
- **Rules previously resting on those measurements stay downgraded** — see the
  reclassification register in §17. **Nothing is re-promoted by this recovery.**
- **Measurements that could be independently verified, were.** The contrast
  ratios in §2 were recomputed from the documented hex values (WCAG 2.x
  relative luminance). All three asserted figures verified, and the check found
  one additional failure the handoff did not report (§2.3).

**What v2 re-verified** is recorded in `home-baseline-v2.md`, which states in its
own header that it approves nothing. One correction is worth carrying here: with
no CSS letterbox compensation there is **no poster-to-video scale jump** — the
legacy ~12% figure was produced *by* the workaround, not by the assets (§8.3).
The §7.5 letterbox requirement and the §13 prohibition are unaffected, and
ADR-0009 §5's poster/video coupling still stands.

Treat every numeric visual value in this document as **[DEFAULT]** unless it
carries an explicit invariant justification that does not depend on a prototype.

---

## 1. Typography

### 1.1 Roles and token model **[INVARIANT]**

Three roles, and only three (ADR-0008 lineage, `design-direction.md` §5):

```text
font-display   headlines, project titles, identity type
font-body      public reading text
font-ui        navigation, controls, small functional labels
```

`font-display` and `font-body` may resolve to the same family. `font-ui` is
independent.

**[INVARIANT]** Faces come from a supported, self-hosted library. Arbitrary
external font URLs and arbitrary uploaded fonts are out of V1 scope.

**[INVARIANT]** Presets are starting points, not a closed set (G5). An
administrator may compose a custom combination from the library.

**[INVARIANT]** No composition may depend on the metrics of one specific
typeface. Optical adjustments belong to the preset, never to the layout.

### 1.2 Current default preset — "Title card" **[DEFAULT]**

| Role | Face | Notes |
|---|---|---|
| `font-display` | Marcellus 400 | Inscriptional Roman capitals. One weight. **Caps and display use only — its lowercase is weak.** |
| `font-body` | Newsreader, variable 200–600, optical size 6–72 | Every reading surface. The optical axis tightens the face as it shrinks. |
| `font-ui` | Newsreader | Navigation currently shares the body serif. |

**[DEFAULT]** Display tracking is per-face and belongs to the preset, never to
the layout: Marcellus `-0.005em`, Spectral `-0.02em`, Archivo `-0.035em`.

### 1.3 Alternate supported presets **[DEFAULT]**

| Preset | Composition | What it tests |
|---|---|---|
| **Plate** | Title card, but Archivo for `font-ui` | Whether navigation should leave the serif |
| **Monograph** | Spectral throughout | One family across all three roles |
| **Festival** | Archivo display + Newsreader body | The serif/sans departure permitted under path B |

**[INVARIANT]** Serif-first is the **default identity**, not a requirement of
every theme. A serif/sans combination is permitted provided editorial hierarchy
survives and the preservation test passes (`design-direction.md` §5, §6).

**Open:** whether `font-ui` leaves the serif is **unresolved**. Title card and
Plate both read well. See §16.

### 1.4 Container-relative display scaling

**[INVARIANT] — the principle.** Oversized display typography **scales relative
to its composition container**, not to the viewport and not from a fixed pixel
ladder. "Oversized" means *a proportion of its grid span*.

This is invariant because **composer correctness depends on it**. The composer's
core promise is that any block can be respanned, reordered, nested or stacked
without a developer. Typography sized against the viewport breaks the moment a
block is respanned — the type no longer fits the space it occupies — so a
viewport-relative display scale would silently void that promise.

**[DEFAULT] — the technique.** `cqw` (container query units) is the preferred
and current implementation:

```text
Display   clamp(40px, 13.3cqw, 250px)   on a container spanning 12 columns
```

`cqw` is the recommended default because it expresses the principle directly.
Any technique that genuinely scales type against its container — a container
query, a resize-driven custom property, or a future CSS mechanism — satisfies
the invariant. **Viewport units do not**, because they measure the wrong thing.

The clamp bounds `40px` and `250px` and the `13.3` coefficient are **[DEFAULT]**
values of the current identity, not invariants.

**The coefficient is face-dependent — it belongs to the preset, not to the
layout.** `home-baseline-v2.md` §8.4 observed that at one container width the
same string fits inside 12 columns in **Title card** (Marcellus) and **overflows
and clips at the right edge** in **Monograph** (Spectral) and **Festival**
(Archivo). `13.3` is tuned to one face and one string length.

This does not touch the **[INVARIANT]** above: display typography still scales
relative to its composition container under every preset. What it locates is
*where the number lives*. The coefficient and clamp bounds are a **face-specific
optical adjustment**, and belong with the preset — **alongside display tracking**,
which §1.2 already treats exactly this way ("per-face and belongs to the preset,
never to the layout"). §1.1's own invariant, that no composition may depend on
the metrics of one typeface, points the same way.

Clipping display type is permitted (`design-direction.md` §6), so a face that
clips is not a defect on its face. The problem is that today it happens
**accidentally rather than by authorship**, changing per preset without anyone
choosing it.

**[PROPOSED GOVERNANCE AMENDMENT — raised, not applied]** Make the display
coefficient and clamp bounds a **preset property**, so face substitution carries
its own optical adjustment. Against §1.2 / §1.4 **[DEFAULT]** only; the
container-relative **[INVARIANT]** is untouched. **The current Title card values
are unchanged** and no other preset's values are proposed here. See §16 item 11.

### 1.5 Type scale **[DEFAULT]**

| Role | Size | Leading |
|---|---|---|
| Display | `clamp(40px, 13.3cqw, 250px)` | — |
| Statement / pull quote | `clamp(26px, 3.2vw, 56px)` | 1.1 |
| Body | `clamp(15px, 1.06vw, 18px)` | 1.74 |
| Secondary body / caption in flow | `clamp(14px, 0.98vw, 16px)` | — |
| Section label | `clamp(14px, 1vw, 17px)` | italic, muted |
| Media caption (over footage) | 13px italic | — |
| Identity mark (nav) | `clamp(10px, 0.74vw, 12px)`, 0.22em tracking, caps | — |
| Meta (years) | 12px | — |

### 1.6 Casing

**[INVARIANT] — the principle.** Caps are **deliberate and rare**, chosen per
use. All-caps is never applied as a default wrapper for a category of text
(`design-direction.md` §6; `SKILL.md`'s tracked-out-eyebrow warning).

**[DEFAULT] — the current allocation.** Which specific elements take caps is the
current identity, and an approved alternate theme may reallocate it:

- **Capitalised:** the identity mark, the oversized wordmark, project titles.
- **Not capitalised:** section labels, navigation items, metadata, buttons,
  any eyebrow above a heading.

**[DEFAULT]** Section labels are sentence-case italic in the body serif.

This is the line between the evidenced all-caps of references 1, 2 and 4 and the
reflexive label-casing `SKILL.md` warns against. `design-direction.md` §6 left
this boundary reserved; exploration has now drawn it.

### 1.7 Measure and leading

**[INVARIANT]** Reading text sits in a **bounded measure** — never
full-viewport-width, never centred as a default (`design-direction.md` §6, A8).
An unbounded measure is a legibility failure, not a style choice.

**[DEFAULT]** The current bounds: reading column **≤ 46ch**, statement / pull
quote **≤ 24ch**. `design-direction.md` §6 sets the outer limit at under 80ch;
46ch is the current identity's tightening of it, and an approved theme may sit
anywhere inside the outer limit.

**[DEFAULT]** Serif body takes 1.74 line-height. A sans body takes less; the
preset owns that adjustment, not the layout.

---

## 2. Colour

### 2.1 Default tokens **[DEFAULT]**

```text
--surface       #F7F3EC   warm off-white, browsing ground
--ink           #16120E   near-black, warm
--accent        #C4361C   restrained vermilion        4.9:1 on surface
--surface-dark  #0C0A08   project environment
--ink-dark      #EDE7DD   foreground on dark
```

### 2.2 Derived colours **[INVARIANT]**

```text
--muted   #6C6862   ≈ ink at 62% over surface     5.0:1 on surface
--rule    #E2DCD2   ≈ ink at 14% over surface     hairline
--frame   #14110F   ink darkened                  empty media well
```

**[INVARIANT]** The administrator sets five colours. `--muted`, `--rule` and
`--frame` are **derived and not admin-settable**, and the derivation — not the
literals — is what implementations carry. Hard-coding these hex values breaks
every alternate palette, so this is theme correctness, not taste.

**[DEFAULT]** The specific derivation coefficients (62%, 14%) are current
values. Any derivation that holds the contrast relationships in §2.3 satisfies
the invariant.

### 2.3 Alternate palettes **[DEFAULT]**

| Palette | Surface | Ink | Accent |
|---|---|---|---|
| Silver gelatin | `#F1F1EE` | `#121314` | `#B02E22` |
| Tungsten | `#F0E7D9` | `#1B1510` | vermilion at **4.4:1** |

### 2.4 Contrast — verified, and size-aware **[INVARIANT]**

**[INVARIANT]** Contrast validation is **size-aware**. A token may be valid for
display use and invalid for body use of the same palette. A single global
pass/fail check is insufficient.

This refines G1 rather than contradicting it: G1 requires WCAG AA but did not
say at which size, and the answer differs by size in more than one palette.

**Recomputed from the documented hex values** (WCAG 2.x relative luminance) on
2026-09-22. Unlike the prototype measurements, these are independently
verifiable and were verified:

| Palette | Pair | Ratio | AA body (4.5) | AA large (3.0) |
|---|---|---|---|---|
| Default | ink on surface | 16.85 | pass | pass |
| Default | muted on surface | 5.00 | pass | pass |
| Default | accent on surface | 4.88 | pass | pass |
| Default | ink-dark on surface-dark | 16.07 | pass | pass |
| **Default** | **accent on surface-dark** | **3.66** | **FAIL** | pass |
| Silver gelatin | ink on surface | 16.44 | pass | pass |
| Silver gelatin | accent on surface | 5.69 | pass | pass |
| Tungsten | ink on surface | 14.76 | pass | pass |
| **Tungsten** | **accent on surface** | **4.40** | **FAIL** | pass |

All three ratios asserted in the handoff verified exactly (5.0, 4.9→4.88,
4.4). The check also found **one failure the handoff did not report**:

**[INVARIANT]** **The default accent fails AA body contrast on the dark
surface (3.66:1).** This is not a Tungsten quirk — it is the *default* palette
on the *project-detail* environment. Since link hover/focus is one of the three
admitted accent uses, and project pages are dark, **the accent must not carry
body-size text on any dark surface** in any palette. Use it at display size, or
pair it with a non-colour affordance (underline, weight) so the accent is not
the sole carrier of meaning (§12).

**[DEFAULT]** On Tungsten, the accent is display-size-only on light surfaces too.

**[ADVISORY]** `--rule` sits at 1.23:1 against surface. That is correct for a
decorative hairline, but it means a rule can never be the sole carrier of
information — grouping conveyed only by a hairline is invisible to many users.

### 2.5 Accent discipline

**Reclassified 2026-09-22.** This section previously graded accent restraint as
INVARIANT. That contradicted `design-direction.md` §5, where the Architect
explicitly placed accent restraint (G3) and near-neutral surfaces (G2) under
**default direction**, departable under the preservation test. The grades below
now match.

**[DEFAULT — G3]** The accent is an identity signal, not a UI system: not body
text, not large fills, not a background for a content region. A custom theme may
depart from this **only** if it still passes the five-part preservation test
(§3.3).

**[DEFAULT]** Exactly three uses in the current identity: **the wordmark, the
email, link hover/focus.**

**[DEFAULT — G2]** The colour on the page comes from the footage; the interface
supplies the quiet.

**[ADVISORY]** If a page seems to need a fourth accent use, the answer is
usually that something else should be removed.

**What remains INVARIANT here**, and is not softened by the above: **A1
media-first** and **A2 restrained chrome** (§3.1); the **size-aware contrast
floor** (§2.4); and the rule that **colour is never the sole carrier of
meaning** (§12). A theme may use more accent; it may not use accent to make the
interface out-weigh the work, and it may not use accent to convey something a
non-colour cue does not also convey.

---

## 3. Theme: customizable vs immutable

### 3.1 Immutable — category A **[INVARIANT]**

Not configurable under any theme:

Media-first · restrained chrome · one primary element per view · asymmetry as a
tool not a default · load-bearing negative space · native media presentation ·
cinematic project pages · type as an active compositional element · the public
site is never product UI · the accessibility floor.

Also immutable: **layout, grid behaviour, spacing and type *ratios*, motion
behaviour and timing, media treatment, the light-browse / dark-project model,
and luminance polarity.**

### 3.2 Configurable — category B **[INVARIANT]**

Five colours (`surface-light`, `ink-light`, `accent`, `surface-dark`,
`ink-dark`) and three typeface roles, from the supported library.

**[INVARIANT]** Changing the theme must never rewrite block config, and block
config must never carry a colour or a typeface. Theme and layout are orthogonal.

### 3.3 The preservation test **[INVARIANT]**

A custom theme departing from the default direction must still preserve **all
five**: accessibility · contrast · clear hierarchy · media dominance · editorial
character. A gate, not a preference.

---

## 4. Spacing, edges, gutters, bands

### 4.1 Tokens **[DEFAULT]**

```text
--edge   clamp(24px, 3.2vw, 56px)     page margin
--gut    clamp(10px, 0.9vw, 20px)     column gutter
--band   clamp(72px, 9vw, 170px)      vertical space between media sections
```

### 4.2 Media gutters **[DEFAULT]**

Gutters **inside a gallery are 4px**, not `--gut`.

Tight gutters are what make a wall read as a contact sheet rather than a grid of
cards. This is the single most load-bearing spacing value in the media system.

### 4.3 Negative space **[INVARIANT]**

Load-bearing. Large unfilled regions are correct output, not space to backfill.

**[DEFAULT]** The About section deliberately leaves roughly two-thirds of its
grid empty.

### 4.4 Band as density carrier **[DEFAULT + ADVISORY]**

**[DEFAULT]** `--band` carries the one-moving-field-per-viewport density default
(§8.3).

**[ADVISORY]** Compressing `--band` is what pushed the page toward a feed in
testing. Treat it as a recommended minimum gap between adjacent media blocks —
**warnable in the composer, not hard-blocked.**

### 4.5 Full bleed **[INVARIANT]**

Media runs to the viewport edge by default. **Text is contained; media is not.**

**[DEFAULT]** Bleed is a block property (`bleed: none | right | both`),
implemented as a negative margin equal to `--edge` — **not** as an escape from
the grid.

---

## 5. The 12-column layout model

### 5.1 Grid **[INVARIANT]**

```text
12 logical columns
colStart >= 1 · colSpan >= 1 · colStart + colSpan <= 13
```

Placement is logical and column-based. **Never pixel coordinates** (ADR-0006).

### 5.2 Nesting **[INVARIANT]**

One level only. A GRID may contain leaf blocks; **a GRID may not contain a GRID
or a GALLERY.**

### 5.3 Placement vocabulary **[INVARIANT]**

Column start · column span · order · alignment · vertical alignment · gap ·
**width mode** · full-bleed/contained behaviour.

**Width mode is confirmed as part of responsive placement configuration**
(Architect decision, 2026-09-22). It was already listed in ADR-0006 §4; this
confirms it as required rather than optional.

Its motivating case: **the About portrait at mobile.** Safe stacking would take
it to full width, where it becomes a profile photo rather than an editorial
portrait. Width mode lets a stacked child stay deliberately narrower than its
container. Width mode is therefore not only a desktop refinement — it is part of
what makes mobile stacking *designed* rather than merely automatic.

### 5.4 Asymmetry **[INVARIANT]**

Available, not compulsory. Unequal spans, deliberate offset and staggered rows
are encouraged where they create hierarchy. **[DEFAULT]** Rows need not
column-align with one another.

**[DEFAULT]** The current asymmetric field:

```text
GRID
├── VIDEO  cols 1–7   row 1     2.39:1
├── VIDEO  cols 8–12  rows 1–2  tall
├── TEXT   cols 1–4   row 2
└── VIDEO  cols 5–7   row 2     3:2
```

### 5.5 Overlap **[DEFERRED]**

An overlap primitive — two children on one row with overlapping column ranges
and a bounded two-layer stacking order — is **deferred**. Not a V1 blocker.

**ADR-0010 does not reopen this.** The bounded HERO title overlay it approves is
*intra-block* — one block, its own frame, a system-fixed two-layer order. This
deferral covers *inter-child* overlap between GRID siblings, and stands.

---

## 6. GRID vs GALLERY **[INVARIANT]**

```text
GRID     = manual composition — specific items in specific places
GALLERY  = a rule arranging an ordered sequence
```

**Never merge them** (ADR-0008 §2). A GRID of three videos and a `VIDEO_GRID` of
three videos may render identically; they remain different capabilities, because
one is authored per item and the other generated from a rule plus a list.

GALLERY presentation modes **[INVARIANT]**:

```text
JUSTIFIED_ROWS    HORIZONTAL_STRIP    SLIDESHOW    VIDEO_GRID
```

**[INVARIANT]** GALLERY may hold image and video together. The mode decides
whether mixing is sensible, not whether it is permitted.

---

## 7. Media

### 7.1 No card chrome **[INVARIANT]**

No container, border, shadow, elevation, padded frame or hover lift. Media sits
directly on the ground.

### 7.2 Aspect ratio — and its one real exception **[INVARIANT]**

Native aspect is preserved. Media is **not** cropped to a uniform tile to
regularise a grid. Mixed aspect ratios in one composition are expected.

**The admitted exception, stated explicitly because it reads as a contradiction:**

`design-direction.md` A6 forbids cropping media to a uniform tile. `VIDEO_GRID`
and `HORIZONTAL_STRIP` are **cell geometries** — a uniform ratio is the point of
the pattern, not a regularisation imposed on unwilling media.

| Surface | Ratio |
|---|---|
| `VIDEO_GRID` | **[DEFAULT]** 16:9 |
| `HORIZONTAL_STRIP` | **[DEFAULT]** 2:3 |
| GRID children, `JUSTIFIED_ROWS`, IMAGE, VIDEO, HERO | native aspect **[INVARIANT]** |

**A6 governs GRID and `JUSTIFIED_ROWS`. These two are the only admitted uniform
surfaces.** Adding a third requires a §20 change. Without this statement A6
reads as forbidding `VIDEO_GRID` outright, which ADR-0008 plainly permits.

### 7.3 fit — per surface, not global **[INVARIANT that it is per-block]**

`fit` is a per-block property. **There is no single correct value.**

**[DEFAULT] `COVER`** on editorial browsing surfaces: `VIDEO_GRID`, preview
walls, gallery cells, the horizontal strip, hero surfaces, any deliberate
editorial crop. Compositions where the frame is chosen and overflow is intended.

**[DEFAULT] `CONTAIN`** wherever cropping destroys essential content: primary
project films, archival material, screenshots and captured UI, graphics and
title cards, any asset deliberately framed by the administrator.

**[ADVISORY]** Reach for `COVER` first on browsing surfaces and `CONTAIN` first
on viewing surfaces. **A film the visitor sits down to watch is shown whole.**

### 7.4 Posters **[INVARIANT]**

```text
poster_media_id  →  thumbnail_url  →  empty media well (--frame)
```

Administrator-selected posters are a **V1 requirement** (ADR-0009), held
relationally on `media`, never as an id in `config`, and covered by
`MEDIA_IN_USE`.

**[INVARIANT]** A refused autoplay shows the poster, never an empty tile.

**[DEFAULT]** Poster fallback is **structural** — the poster sits beneath the
video and the video fades in over it — not scripted. A structural fallback holds
when scripting fails.

### 7.5 Letterbox **[INVARIANT — requirement; method unresolved]**

Some assets carry baked-in letterbox. Under `COVER` these render black bars
inside the composed frame.

**The ingestion pipeline must solve this structurally. One-off CSS scaling must
not ship.**

**The method is deliberately unresolved** — detect-and-strip, or a stored
active-area crop. See §16. Whichever is chosen must apply identically to a
poster and its video.

### 7.6 Focal point **[DEFERRED — do not implement]**

Normalised `focalX` / `focalY` applied as `object-position` is **deferred by
Architect decision** pending testing against a larger real media library.

**Do not add these fields.**

**Accepted consequence, stated plainly:** without a focal point, `COVER` crops
from centre. Exploration found this degrades roughly half the current library at
extreme ratios — one cover reduced to "an abstract teal field with part of a
shoe". Until the deferral is revisited, **the mitigation is editorial**:
administrators choose assets and cells that survive a centre crop, and the
`CONTAIN` option exists for assets that do not.

---

## 8. Media wall rules

### 8.1 Pattern **[DEFAULT]**

Uniform cell geometry · 4px gutters · full bleed · no captions · no chrome ·
mixed moving and still cells.

**[DEFAULT]** Still cells are **rest points and part of the pattern**, not a
fallback for missing video.

### 8.2 Column counts **[DEFAULT, bounded by INVARIANT]**

**[DEFAULT]** 3 / 2 / 1 across desktop / tablet / mobile.

**[INVARIANT]** Column counts are bounded by validation at every breakpoint and
**must fall at narrower breakpoints**. A four-column wall on mobile is
unreadable and a decode disaster.

### 8.3 Density **[DEFAULT + ADVISORY]**

**[ADVISORY]** The variable that breaks the identity is **not** the number of
videos on the page. It is **the number of separately-framed moving fields in one
viewport.** A tight-gutter wall of nine tiles reads as *one* field — the eye
takes it the way it takes a strip of negatives. Two differently-shaped moving
fields in one viewport is where it tipped.

**[DEFAULT]** One moving field per viewport height.

**[ADVISORY]** This is **not a system invariant.** A reviewed, performance-safe
exception is legitimate. **The composer should surface the condition, not forbid
it.**

**[ADVISORY]** A wall and an asymmetric media field must not sit adjacent in one
scroll — testing identified this as the failure mode that turns the page into a
content platform. Composer-warnable, not blocked.

### 8.4 Clip selection **[ADVISORY]**

Review guidance only. **Never validated in code.**

- **~4 seconds is a strong default minimum** for preview and wall footage. Below
  that the cut becomes the subject and the tile reads as a GIF. A deliberately
  short loop that has been reviewed and approved is fine.
- **A clip opening on near-black should not go in a small tile** — most of its
  loop reads as a hole in the grid. Use a large cell, or trim the in-point.
- **[ADVISORY]** The current 5 moving + 4 still ratio reads best, but was
  constrained by having only five eligible clips. **Re-test with a fuller
  library** before treating it as a default.

---

## 9. Video playback presentation states

### 9.1 Modes **[INVARIANT]**

| Mode | Context | autoplay | muted | inline | off-screen | controls |
|---|---|---|---|---|---|---|
| `CLICK_TO_PLAY` | Primary project film; audio intended | no | no | yes | n/a | **yes** |
| `AUTOPLAY_VISIBLE` | **Every multi-video surface** | yes | **forced** | yes | **must** pause | no |
| `AUTOPLAY_AMBIENT` | Standalone ambient only | yes | **forced** | yes | **may** suspend | no |

**[INVARIANT]** `autoplay`, `muted`, `playsInline`, `preload` and
`pauseWhenOffscreen` are **derived from the mode and are never inputs.**

**[INVARIANT]** `AUTOPLAY_AMBIENT` is restricted **by context, not by count** —
never inside a GRID, never on a GALLERY, never on a `VIDEO_GRID` item, never
inherited into a multi-item surface.

**[INVARIANT]** `EXTERNAL_VIDEO` supports `CLICK_TO_PLAY` only.

**[INVARIANT]** No public page initiates audible playback.

### 9.2 Lifecycle **[INVARIANT]**

```text
visible: play  ·  near: prepare  ·  far: pause and release
```

The **mechanism is deliberately unspecified.** `IntersectionObserver` is an
implementation detail and is not locked into the architecture.

### 9.3 Carried implementation constraints **[INVARIANT — from testing]**

Two findings that are implementation constraints, not design choices. Both
produce silent failures.

1. **Playback must be re-driven when a source becomes ready after mount.** It
   cannot depend solely on visibility transitions — a standalone ambient surface
   is never observed entering the viewport, so a source arriving late never
   starts.
2. **`playsInline` must be set as a property or a correctly emitted boolean
   attribute.** A JSX-style empty-string attribute is falsy and gets stripped,
   which silently breaks iOS autoplay on **every** surface. **Desktop testing
   cannot detect this.**

**Grading note.** These surfaced during legacy prototype testing and are graded
**INVARIANT** because neither depends on a prototype measurement. Both are
independently derivable:

1. Follows from the mode definitions alone. `AUTOPLAY_AMBIENT` is by definition
   a standalone surface that starts automatically; if start is driven only by a
   viewport-entry transition, a surface already in view at load never receives
   one. The rule is a consequence of ADR-0008's own semantics.
2. Is a property of HTML/JSX attribute handling, not of this project: an
   empty-string attribute value is falsy and is dropped, so `playsInline` never
   reaches the element. It is verifiable on any page, and it is **autoplay
   safety** (§9.1) — protected from downgrade.

**Both were reconfirmed by Home v2** (`home-baseline-v2.md` §8.1), which observed
the re-drive failure twice before fixing it and set `playsInline` as both a
property and a real attribute value.

What was *not* retained is the supporting measurement (the legacy frame-rate
figure), which remains unverified and appears only in `design-handoff.md` as
historical evidence. Home v2 §7 reports its own frame rate explicitly as an
environment-bound observation and **not a number to specify**.

---

## 10. Motion

### 10.1 Content vs interface **[INVARIANT]**

**Content motion is encouraged. Interface motion is restrained.** The footage
moves; the interface around it does not.

**Forbidden without exception:** hover lifts · card scale · staggered entrances ·
fade-and-slide-up on scroll · parallax as decoration · scroll-hijacking ·
looping animation on interface elements · animated chrome around already-moving
footage.

**Permitted:** motion that answers a user action and shows what changed.

### 10.2 Signature transition **[DEFAULT]**

One moment owns the site's sense of motion: **light-to-dark project entry.** The
clicked frame flies to full bleed while a dark curtain wipes up from below; the
project title holds as a title card; then it reverses into the project page.
Paper becomes cinema, and the media is **handed off rather than cross-faded**.

**[INVARIANT]** It is owned by the **shell, not the block** — delegated from any
element carrying a project reference — so it survives reorder, duplication and
deletion. A block-owned transition would break the composer's core promise.

**[DEFAULT]** Curtain 720ms · frame flight 760ms · title in at +720ms ·
`cubic-bezier(.76, 0, .24, 1)`.

### 10.3 Reduced motion **[INVARIANT]**

`prefers-reduced-motion` produces a **deterministic still**, not a shortened or
slowed animation. All video paused on its poster; the signature transition
becomes a hard cut with the same hold. **Checked before playback starts.**

---

## 11. Responsive fallback and override model

### 11.1 Breakpoints **[INVARIANT]**

Three fixed: desktop, tablet, mobile. **No arbitrary breakpoint creation.**

```text
desktop   explicit composition
tablet    derives from desktop unless overridden
mobile    safe stacking unless overridden
```

### 11.2 Automatic fallback **[INVARIANT]**

Every grid child falls to full width in `position` order. This is **computed,
not authored**, so a page nobody has given mobile attention still renders
readably rather than breaking.

### 11.3 The floor is not the design **[INVARIANT]**

**Every production page still requires a mobile design review.** The automatic
fallback guarantees nothing is *broken*; it does not guarantee anything is
*good*. Optional per-breakpoint overrides refine the fallback where review finds
it merely adequate.

Both halves matter: "mobile must be designed" does not mean the architecture
lacks automatic derivation, and automatic derivation does not mean mobile needs
no design.

### 11.4 What persists, simplifies, stacks

| | |
|---|---|
| **Remains at every size** | light-browse / dark-project · media dominance and full bleed · the oversized display gesture · reading measure · accent discipline · the signature transition |
| **Simplifies** | overlap and extreme asymmetry reduce where they harm readability |
| **Stacks** | every grid child to full width in `position` order |

**[INVARIANT]** Oversized typography adapts by itself — because display type
scales against its **composition container** rather than the viewport, stacking
to one column resizes it correctly with no breakpoint rule (§1.4). The
invariant is the container-relative principle; `cqw` is the default technique
that expresses it.

### 11.5 GALLERY defines its own narrow-width behaviour **[INVARIANT]**

**Approved by the Project Owner / Architect on 2026-09-22.** This was raised as a
proposed amendment from `prototypes/home/home-baseline-v2.md` §8.6 and is now
adopted. It **extends** §11.2's reach rather than weakening it.

The rule:

- **GRID children keep the automatic safe-stack fallback** of §11.2, unchanged —
  every grid child falls to full width in `position` order, computed not
  authored.
- **GALLERY does not inherit GRID child stacking.** A GALLERY is a flow /
  presentation abstraction: one block whose internals are arranged by a rule. It
  has no grid children, so there is nothing for the block-level stack to reach.
- **Every GALLERY presentation mode must provide bounded narrow-width
  behaviour** of its own. This applies to `VIDEO_GRID`, `JUSTIFIED_ROWS`,
  `HORIZONTAL_STRIP` and `SLIDESHOW`. A mode with no defined narrow-width
  behaviour is incomplete.

**`VIDEO_GRID` already satisfies this** — per-breakpoint column counts, bounded
by validation and required to fall at narrower widths (§8.2, ADR-0008 §6, §9).
The other three modes do not yet, and must.

**The evidence.** At 375px a single-row `JUSTIFIED_ROWS` gallery left a 4:5 still
at **45×176** — a sliver, its aspect destroyed by the shared row height. Nothing
in the block-level fallback reflowed it, because it had no grid children to
stack. The failure is not specific to one composition: any `JUSTIFIED_ROWS` block
mixing wide and narrow aspects reaches it.

**What remains pending: the exact per-mode behaviour.** Row heights,
items-per-row bounds, narrow-width algorithms and final mobile compositions are
**not decided here** and remain subject to mobile visual validation. What is
settled is *that* each mode owes one, and where the responsibility sits — with
the presentation mode, not with the block-level stack. See §16 item 10.

### 11.6 First responsive validation — what it settles, and what it does not

**The Private Project Gate is the first page exercised at narrow widths and at
constrained height** (2026-09-22). Evidence:
`prototypes/private-gate/Private Gate 5B Responsive.dc.html` and
`private-gate-5b-responsive.md`; the integrated result is
`page-specifications.md` §6.9. **The desktop candidate 5B v2 is unchanged by
it**, and nothing in it is approved.

**[DEFAULT]** The gate's derivations — its ≤430 navigation treatment, heading
clamp, field measure and constrained/squeezed height thresholds — are **that
page's answers on that page's evidence.** They live in `page-specifications.md`
§6.9 and **are not site-wide rules.** Do not apply the gate's numbers to another
page.

**The other five pages remain pending responsive validation.** §11.3 is
unchanged by this: the automatic fallback still guarantees only that nothing is
*broken*, not that anything is *good*.

#### Cross-cutting evidence — evidence only **[ADVISORY]**

Two observations generalise beyond the gate. **Neither is promoted to a rule
here.** One page's evidence is not enough to make either an invariant, and doing
so would repeat the over-grading §17 had to undo.

1. **Interactive surfaces may need top-aligned flow at constrained visual
   heights.** Centring a growing element inside a shrinking viewport pushes its
   bottom off screen — the gate's failure was the mechanism, not a quirk. Any
   page whose primary control sits below a growing element has the same
   exposure. Carried as §16 item 13.
2. **Display typography likely benefits from bounded, composition-relative
   clamping.** The gate sizes its heading `clamp(min, cqw-of-the-spine,
   desktop-ceiling)` — the third approach in the candidate set, after Home's
   `13.3cqw` of a grid container and Contact's `cqw` of the spine, and **the
   first with an explicit ceiling.** Carried as §16 item 11.

**Site-wide mobile navigation is explicitly not resolved by this page.** Hiding
the nav is right for a surface whose job is one field; Home, Art Works, Project
Detail, About Me and Contact each need their own answer and **must not inherit
the gate's**. Carried as §16 item 14.

**Simulated constrained height is not real-device testing.** This is a
statement about the quality of the evidence, not a design rule, so it carries no
grade — but it bounds what the grade above means. Responsive *candidate* status
is not a claim about behaviour on an actual software keyboard; the QA coverage
that would settle that is listed in `page-specifications.md` §6.9.

---

## 12. Accessibility floor **[INVARIANT]**

Holds under every theme and every composition. Not tradeable.

- Responsive to mobile
- Visible keyboard focus
- `prefers-reduced-motion` respected, with a deterministic still
- Text/background contrast meeting **WCAG AA**, validated **size-aware** (§2.3)
- Colour is never the sole carrier of meaning
- `position` determines DOM order, and therefore keyboard and screen-reader
  order — **never derived from visual placement** (`colStart`)
- No audible autoplay

---

## 13. Public-site anti-patterns **[INVARIANT]**

### Product-UI tells

Identical rounded cards · one border-radius on everything · soft grey drop
shadows · elevation systems · glassmorphism, frosted or translucent panels ·
gradient washes as decoration · floating pill navigation · sticky SaaS chrome ·
badges/pills/chips as ornament · dashboard framing, stat tiles, KPI rows,
feature-grid marketing sections.

### Generated-design tells

Fade-and-slide-up on every section · hover transitions on every card ·
tracked-out all-caps eyebrows · meta strings joined with middle dots · `WORD —
fragment` constructions · monospace for small data labels · `→` appended to link
text · numbered markers on non-sequences · a single accented word in a headline ·
tinted near-blacks standing in for a considered dark.

### Media and video

A video wall reading as a social feed, media dashboard or asset browser · hover
lift, scale, shadow or staggered entrance on video tiles · autoplaying audio ·
`AUTOPLAY_AMBIENT` on anything but a standalone ambient video · an autoplay
surface whose poster frame was never considered · media cropped to a uniform
ratio outside the two admitted surfaces (§7.2) · shipping CSS letterbox
compensation (§7.5).

### The card rule **[INVARIANT]**

**Do not introduce a reusable card primitive in the public portfolio visual
language.** It is the single fastest route to making the page look like a
product. The recurring patterns in this system are **patterns, not components**,
and none of them is a card.

---

## 14. Admin CMS visual-system separation **[INVARIANT]**

**Scope: everything above §14 governs the public site only.**

The Admin CMS has an **intentionally separate, function-first visual system**
(CLAUDE.md §13). It is free to use reusable panels, cards, tables, and any
conventional application furniture. Nothing in §1–§13 constrains it.

**[INVARIANT]** The CMS may use its own functional sans-serif UI, independent of
the public theme.

**[INVARIANT]** The CMS must **not** be styled by the public theme it edits. An
administrator who selects a broken combination must still be able to see the
controls to fix it.

**[INVARIANT]** Public portfolio visual quality takes priority over making the
CMS look elaborate.

---

## 15. Recurring patterns **[DEFAULT]**

Patterns, not components. None is a card.

1. **Navigation line** — identity mark in tracked caps at cols 1–5, destinations
   right-aligned at cols 7–12, on the same 12 columns as content. Not sticky. No
   rule, no mega-menu, no pill, no frosted panel, no arrows.
2. **Oversized display type** — fit to its column span in container-width units.
   May be clipped by the viewport or overlapped by media. **One per view.**
3. **Media wall** — uniform cells, 4px gutters, full bleed, no captions, no
   chrome, mixed moving and still.
4. **Asymmetric media/text composition** — unequal spans across two rows, one
   text child among media children, staggered so rows do not align.
5. **Editorial text section** — measured column off-centre, large deliberate
   void, optional IMAGE at the far columns bottom-aligned to the text baseline.
6. **Horizontal strip** — equal-ratio covers clipped at both viewport edges,
   drag or wheel to scroll, title and year beneath. **[ADVISORY]** Needs 5+
   items; below that it stops overflowing, the clipped-edge signal disappears
   and it reads as dead space. Card width must be a strip setting tuned against
   item count, **not a constant**.
7. **Media caption** — 13px italic, bottom-left, inside the frame, on the
   footage. Sparingly; not every video needs one.
8. **Project transition** — §10.2.

---

## 16. Open questions

Carried forward. **Do not close these by inference during implementation.**

| # | Question | Status |
|---|---|---|
| 1 | **Letterbox method** — detect-and-strip at ingestion, or stored active-area crop? Affects what the CMS must show the administrator. | **Requirement approved, method unresolved** |
| 2 | **Focal point** — does one normalised focal point per asset survive 2:3, 2.39:1, tall and 16:9, or is per-container framing needed? Needs 10+ real covers, not four. | **Deferred by Architect** |
| 3 | **`font-ui`** — does navigation leave the serif? Title card vs Plate; both read well. | Unresolved |
| 4 | **Wall cell count and still/moving ratio** — retest with a fuller library. | Unresolved |
| 5 | **Overlap primitive** | Deferred, not a V1 blocker |
| 6 | **`VIDEO_GRID` column maximum** — a bound must exist; the number does not. | Unresolved |
| 7 | **`AUTOPLAY_VISIBLE` visibility threshold** — what counts as "sufficiently visible". | Unresolved |
| 8 | **Mobile composition for every page** — no reference evidence exists. **One page is now validated:** the Private Project Gate, at 768 / 430 / 390 / 375 and at constrained height (§11.6, `page-specifications.md` §6.9). Home, Art Works, Project Detail, About Me and Contact remain pending, and must not borrow the gate's derivations. | **1 of 6 validated as candidate; 5 pending** |
| 9 | **All six pages now have a candidate** — Home, Art Works (2C v2), Project Detail (1B v2), About Me (3B v2), Contact (4B v2), Private Gate (5B v2). None is approved. The gate theme conflict was resolved on 2026-09-22 in favour of a route-independent pre-auth surface (`page-specifications.md` §6.3). | **Exploration complete; no candidate conflicts open** |
| 10 | **GALLERY narrow-width behaviour per presentation mode** — the *principle* is approved (§11.5): GALLERY does not inherit GRID child stacking and every mode owes bounded narrow-width behaviour. `VIDEO_GRID` satisfies it via column counts; **`JUSTIFIED_ROWS`, `HORIZONTAL_STRIP` and `SLIDESHOW` still need theirs defined.** Exact behaviours pending mobile validation. | **Principle approved; per-mode behaviour pending** |
| 11 | **Display coefficient as a preset property** — `13.3cqw` is tuned to one face; face substitution changes clipping without anyone authoring it (§1.4). Contact 4B v2 §6 adds a second dimension: sizing display type against **the element it must align to** rather than against the page removes the guess, and **the other candidates' coefficients have not been re-checked against this.** The Private Gate responsive validation adds a third: `clamp(26px, 8.2cqw of the spine, 46px)` — spine-relative **and bounded by the desktop size**, so narrow widths can never exceed it (§11.6). That is evidence for the clamped, spine-relative form; **one convention should be chosen for all pages**, and none has been. | **Proposed amendment, not applied** |
| 12 | **Bounded HERO overlay content** — the *capability* is approved (ADR-0010): intra-block, title from `projects.title`, closed config, dismissal on media activation, `CLICK_TO_PLAY` or IMAGE only. Its **visual use on Project Detail remains candidate**, and the narrow-width stacked treatment awaits mobile validation. | **Capability approved; visual use candidate** |
| 13 | **Constrained-height behaviour for interactive surfaces** — the Private Gate showed that centring a growing element inside a shrinking viewport pushes its action off screen, and answered it with top-aligned flow below ~620px (§11.6). Whether that becomes a general rule, at what threshold, and for which surfaces, is **not decided on one page's evidence**. | **Evidence recorded on one page; not a system rule** |
| 14 | **Site-wide mobile navigation** — the gate hides the public nav at ≤430 because it has one job and never removes its escape route. Home, Art Works, Project Detail, About Me and Contact each need their own answer. **Explicitly not resolved by the gate, and not to be inherited from it** (§11.6). | **Unresolved** |

---

## 17. Reclassification register

Governance audit, 2026-09-22. The first draft over-graded several rules as
INVARIANT. Each change below is a **downgrade**; no rule was strengthened.

| § | Rule | Was | Now | Reason |
|---|---|---|---|---|
| 1.4 | Display scaling | INVARIANT (whole) | **INVARIANT** principle + **DEFAULT** technique | The principle — type scales against its container — is composer correctness. `cqw` and the clamp values are implementation choices. |
| 1.6 | Casing | INVARIANT (whole) | **INVARIANT** principle + **DEFAULT** allocation | "Caps are deliberate, never a default wrapper" is direction-backed. *Which* elements take caps is the current identity. |
| 1.7 | Measure | INVARIANT 46ch / 24ch | **INVARIANT** bounded + **DEFAULT** figures | Direction sets the outer limit under 80ch. 46ch is this identity's tightening. |
| 2.2 | Derived colours | INVARIANT incl. coefficients | **INVARIANT** derivation + **DEFAULT** 62% / 14% | Deriving rather than hard-coding is theme correctness; the percentages are values. |
| 2.5 | Accent restraint | **INVARIANT** | **DEFAULT** | **Contradicted `design-direction.md` §5.** The Architect placed G3 under default direction, departable under the preservation test. |
| 2.5 | "Colour comes from the footage" | **INVARIANT** | **DEFAULT** | Same — this is G2 territory. A1/A2 remain invariant and carry the real constraint. |
| 11.4 | Oversized type adapts | INVARIANT via `cqw` | **INVARIANT** via container-relative principle | Restated so it does not name a technique. |

**Re-justified, not downgraded** — §9.3's two carried constraints keep INVARIANT
because both are independently derivable without any prototype measurement, and
one is autoplay safety. Home v2 §8.1 reconfirmed both.

### Deliberately not downgraded

Protected as genuine correctness constraints, regardless of how they were first
evidenced:

autoplay safety and forced muting · no audible autoplay · `AUTOPLAY_AMBIENT`
context restriction · `EXTERNAL_VIDEO` mode restriction · composer ownership,
nesting depth and `position`-ordering correctness · shell-owned signature
transition · the accessibility floor including size-aware contrast, reduced
motion and DOM order · automatic responsive safe stacking · the public-site /
Admin CMS visual-system separation · the no-card-primitive rule · poster
resolution and `MEDIA_IN_USE` participation · letterbox must not ship as CSS
compensation.

**Net effect:** 7 downgrades. The system is now materially less prescriptive
about *how it looks* and unchanged about *how it must behave*.

---

## Change control

This document is **Draft**. It becomes part of Tier 1 only on explicit Architect
approval. Until then it does not outrank the visual references or human product
intent.

It does **not** authorise implementation. Three ADRs (0006, 0007, 0009) carry
unapplied schema work; `db/schema.ts` and `openapi.yaml` remain unchanged.
