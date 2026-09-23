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

#### Systematic evidence — **SHARED RESPONSIVE CANDIDATE — SYSTEM VALIDATED**

The observation above has since been tested systematically. Evidence:
`prototypes/responsive-system/Display Typography Scaling.dc.html` and
`display-typography-scaling.md`, accepted by the Project Owner on 2026-09-22 —
4 sizing strategies × 4 representative compositions × 3 faces × 5 strings ×
7 widths, every figure taken from **measured glyph advances** for the real
loaded face rather than coefficient arithmetic.

**Status is a method-level system grade.** It is **not Design Approved, not
production-ready, not page-validated, and not a universal numeric
specification.** No page has been changed or re-validated under it.

**The reference box.** The principle already held here gains a precise
statement of *which* container:

```text
REFERENCE BOX = the composition / alignment container
```

**Not automatically the viewport, the whole page, or the outer grid.** It is the
box the type must visually align to — the grid span, the spine, the form column.

**[DEFAULT] The method.**

```text
font-size: clamp(
  preset-scoped minimum,
  preset-scoped coefficient × composition-container width,
  composition-scoped maximum
)
```

CSS container query units such as `cqw` express this directly, with the
container context set on the box the type aligns to.

**The shared decision is the METHOD. The coefficient, minimum and maximum are
not one global numeric set** — see the scoping table below.

**Why viewport-relative is rejected as the *default* reference.** Two distinct
failures, both measured:

1. **It cannot know the box.** Type sized against the viewport overflowed a
   narrower internal composition by **51–112%** — 151–157% on an 8-column
   project title, 203–212% on a 6-column spine.
2. **It drifts even on the composition it was tuned for.** Tuned against Home
   at 1440, it still overflowed Home by **3–6% at every other width**, because
   the page's **edge padding is a fixed pixel value** — so composition width is
   *not* a constant fraction of viewport width. A viewport coefficient is
   correct at exactly one width.

Stated narrowly, and no wider than the evidence supports:

> **Viewport width is not the default reference box for aligned display type.**

This does **not** say viewport units are never valid. It says they are the wrong
reference for type that must align to an internal composition.

**Composition-relative holds.** Utilisation was **100% at all seven widths in
all four compositions** with a single coefficient. Nothing else tested did that.

**The two bounds are not equally evidenced, and must not be presented as if
they were.**

| Bound | Standing | Evidence |
|---|---|---|
| **Maximum** | **Evidence-backed · load-bearing · composition-scoped** | Home at 1440 wants 142px and is clamped to 120px (84% utilisation). Without it a 12-column display keeps growing past what the page can carry |
| **Minimum** | **Precautionary preset guard — not independently validated** | **Never engaged.** The smallest size anywhere in the matrix was 35px at 375 |

The prototype's `26` and `120` are **experiment values, not universal site
constants**, and 26px must not be presented as a validated threshold.

**Face sensitivity, measured.** Advance per 1px of size varied **6–15%** across
Marcellus, Spectral and Archivo. At a Marcellus-tuned 100% fill the same string
renders at **107% in Spectral** and **104% in Archivo** — both overflow.

- The sizing **method is face-independent**.
- The **coefficient is typography-preset / font-face scoped**, comparable to
  other preset metrics such as **tracking**, which §1.2 already treats this way.
- **A face swap must not silently inherit a coefficient tuned for another
  face.** This is the mechanism behind `home-baseline-v2.md` §8.4's clipping,
  now stated precisely.

**There is no universal `cqw` coefficient, and none should be created.**

**Content length: wrap, never shrink.** At one coefficient in one box, the same
face, utilisation ran 51% (short) → 85% (medium) → 100% (title) → **223% and
three lines** (a long title). Content length dominates every other variable.

> **Long display content wraps.** It does **not** receive a smaller coefficient
> merely to remain one line.

This does **not** claim all display text must remain one line. The `fit (JS)`
control shows *why* shrink-to-fit is the wrong answer rather than merely
unnecessary: it gave one project a 94px title and another a **42px** title in
the same template, so **size would encode title length rather than hierarchy**.

**What is preset-, composition- or page-scoped**

| Value | Scope |
|---|---|
| Coefficient | **Preset** (per display face) |
| Minimum | **Preset** — a precautionary legibility floor |
| Maximum | **Page or composition** |
| Reference box | **Composition** — the thing being aligned to |

**No JavaScript is required, and none enters the production contract.**
`clamp()` plus container query units express the method completely. **JS
shrink-to-fit is rejected as the production sizing model**; the JS in this
experiment exists only as measurement and comparison evidence.

**This reconciles the candidate set rather than replacing it.** Home's
`13.3cqw`, Contact's spine-relative `cqw` and the Gate's
`clamp(26px, 8.2cqw, 46px)` are **already the same method** with different
reference boxes and bounds. Contact and the Gate size against the box their type
aligns to; **Home sizes against a container wider than its own alignment
target**, which is why it clips on a face swap. No page needs a new approach —
Home needs its reference box corrected, and **that is a page change, not made
here.**

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

**`JUSTIFIED_ROWS` now satisfies it too**, as a **SHARED RESPONSIVE CANDIDATE —
SYSTEM VALIDATED** (§11.7). **`HORIZONTAL_STRIP` and `SLIDESHOW` still do not,
and must.**

**The evidence.** At 375px a single-row `JUSTIFIED_ROWS` gallery left a 4:5 still
at **45×176** — a sliver, its aspect destroyed by the shared row height. Nothing
in the block-level fallback reflowed it, because it had no grid children to
stack. The failure is not specific to one composition: any `JUSTIFIED_ROWS` block
mixing wide and narrow aspects reaches it.

**What remains pending: the exact per-mode behaviour, for two of the four
modes.** `VIDEO_GRID` has its column counts; `JUSTIFIED_ROWS` now has a shared
system candidate covering row height, items-per-row and the narrow-width
algorithm (§11.7). **`HORIZONTAL_STRIP` and `SLIDESHOW` still have none**, and
remain subject to visual validation. What was settled here — *that* each mode
owes one, and that the responsibility sits with the presentation mode rather
than the block-level stack — is unchanged. See §16 item 10.

**A system candidate is not a page validation.** §11.7 settles how the mode
behaves at a given width; it does not settle how any page looks using it.

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

### 11.7 `JUSTIFIED_ROWS` narrow-width behaviour — **SHARED RESPONSIVE CANDIDATE — SYSTEM VALIDATED**

**Status, precisely.** The behaviour below is validated **at system level**: one
expression, exercised across 5 datasets × 11 widths with zero starved cells. It
is **not Design Approved, not production-ready, and not page-validated.** No
page using the mode has been validated with it.

Evidence: `prototypes/responsive-system/Justified Rows Narrow Width v2.dc.html`
and `justified-rows-narrow-width-v2.md`, accepted by the Project Owner on
2026-09-22 as the shared responsive candidate. **v1**
(`Justified Rows Narrow Width.dc.html` / `justified-rows-narrow-width.md`) is
**retained unchanged as rejected / comparison evidence** — it holds the
sequence-average behaviour this pass replaced and the starved-cell failure of
the desktop-as-is algorithm. No page candidate was modified to produce either.

#### The defect it fixes

The desktop-oriented behaviour the page candidates ship today — fixed 300px
target, greedy fill, orphan merge — produces **a starved cell at every tested
width, including desktop**: 102px at 1440, 103px at 1024, 89px at 768, 77px at
390. With a fixed target height a row's cells divide the measure in proportion
to their aspects, so a portrait beside two wide items always takes the
remainder. The narrow-width brief surfaced a bug the desktop compositions
already had.

#### The candidate **[DEFAULT]**

```text
T      = W >= 1024 ? 3 :
         W >= 700  ? 2 :
                     1          // intended items per row, not a limit
ref    = 1.6                    // fixed reference aspect
target = (W - gap × (T - 1)) / (T × ref)
floor  = max(120px, 0.10 × W)   // minimum cell width
ceil   = 1.25 × W               // maximum cell height
gap    = 4px
```

Pack in **source order**. Close a row when the solved height reaches the target,
or before adding an item that would push any cell below the floor. Re-check
solved rows and move a trailing cell down while the floor is violated. Cap
solved row height at the ceiling — the row then renders ragged. **Single-item
rows are exempt from the floor**; a lone item cannot starve.

Deterministic: same items, same width, same output, every time.

#### Why sequence-dependent references were rejected

A reference aspect derived from the sequence itself **couples every item to
every later item**. Appending media changes the reference, which changes the
target height, which repacks gallery content the visitor may already be looking
at. Measured, with the first nine items unchanged:

| Reference | 1440 +6 portrait | 600 +6 portrait | 375 +6 wide |
|---|---|---|---|
| sequence average (v1) | 312 → **402** (+90) | 392 → **505** (+113) | 245 → **208** (−37) |
| median | 268 → **663** (+395) | 337 → **833** (+496) | 211 → **184** (−27) |
| trimmed 20% | 307 → **444** (+137) | 385 → **558** (+173) | 241 → **187** (−54) |
| **fixed 1.6** | **298 → 298 (0)** | **375 → 375 (0)** | **234 → 234 (0)** |

The average raises the target by 29% on a six-item append. The median is worse
still — a median over a small sample is a step function, so one appended item
can move it a whole aspect class. Trimming only softens it. **A fixed reference
removes the coupling entirely: Δtarget is exactly 0, at every width, for every
tested append.**

This is why `ref` is a **system constant and not a per-page value**. A per-page
or per-gallery reference would reintroduce the coupling it exists to remove.

#### Append stability — exactly what was tested **[DEFAULT]**

Tested as a real append (9 → 18 items), not as two unrelated datasets:

- **Completed rows above the current tail remain stable.** Row-boundary runs
  were prefix-identical: **3/3 at 1440, 7/7 at 600, 9/9 at 375**.
- **Appending may repack the current tail** — the row that was incomplete, and
  which the append exists to finish.
- **Later media must not globally repack already-completed rows above it.**

1–3 of the first nine items still move by more than 5% after an append, and
that movement is **confined to the final row**. The instrument measures
*prefix* stability — it counts matching row boundaries from the start and stops
at the first divergence — which is the right property for this claim and should
not be read as a guarantee about anything below the tail.

#### Row and tail semantics **[DEFAULT]**

- A **justified row** fills the measure exactly, and **may not contain a cell
  below the minimum floor**.
- A **ragged tail is not inherently defective.** It is what honest
  native-aspect packing looks like when the remainder cannot fill a row without
  cropping.
- **A tail is defective only if its own cell is starved** — below the floor.
  No such fragment was observed in any tested combination.
- **A tail may merge into the previous row only when the merge starves no
  cell.** Otherwise it stands ragged.
- **Tall and extreme media may remain ragged** while bounded by the ceiling.
- **No fixed item-per-row maximum is required** by this candidate. The floor
  produces the counts implicitly and adapts to content — two landscapes pair at
  375, a portrait beside them does not. A cap would be a number chosen for
  convenience.
- **Source order remains invariant.** Floor enforcement and orphan merge move
  row boundaries only; they never swap, promote or defer an item. This is
  consistent with the §12 accessibility invariant that DOM order follows
  `position` — verified here, not newly asserted.

#### What the evidence establishes

Across 5 datasets × 11 widths: **no starved justified cells** · **source order
preserved in every combination** · **native aspect preserved**, every cell
within 2% of its source ratio · **no crop introduced** · **portrait-dominant
datasets usable** (dataset D, 12 items, 8 in the 0.5–0.8 band — no starvation,
no repeated monoliths) · **wide and extreme media bounded** by the ceiling ·
**431–699 explicitly tested** · **9 → 18 append explicitly tested**.

The `T` change at 700 is **not** a discontinuity — it moves five rows to six and
nothing else jumps, because `T` only sets the target while the floor keeps
pairing items above it.

#### The 480 → 450 transition — preserved, deliberately not smoothed

Between 480 and 450 the last portrait pairings dissolve and portraits begin
standing alone at the ceiling (563px = 1.25 × 450, exactly the bound).

It is **bounded**, **deterministic**, and **caused by enforcing the
minimum-cell floor** — the rule refusing a sub-120px cell, which is the rule
working rather than failing. It has **not** been smoothed by inference, and must
not be smoothed without evidence.

**Whether it is aesthetically desirable is a page-level visual-validation
question**, and the owner's to judge by eye.

#### Constant status

```text
ref    = 1.6
floor  = max(120px, 0.10 × W)
ceil   = 1.25 × W
```

These are **EMPIRICAL SYSTEM CONSTANTS SUPPORTED BY CURRENT EVIDENCE.** They are
**not mathematically derived and not permanently final.** `1.6` sits between the
library's landscape cluster (1.78–2.04) and its portraits (0.65); the floor
comes from observed failure — 77–103px cells read as slivers, 119–168px did not.

**Revisit them only if page-level validation produces a concrete failure.**
Adjusting them on taste, per page, or to smooth the 480/450 step is not
supported by this evidence.

**No administrator control is introduced or required, and no per-page algorithm
override is permitted.** One expression, one set of constants, every page.

### 11.8 Shared candidates under real page use — first page-level consumption

**Home is the first page to consume both shared responsive system candidates in
real use, and neither failed** (2026-09-22,
`page-specifications.md` §1.7, from
`prototypes/home/home-baseline-v2-responsive.md`).

Three observations generalise. **None creates a new rule, and none of Home's
numbers is promoted.**

1. **The shared display-typography METHOD survived real page use.** Applied to
   Home's actual composition across eleven widths, utilisation held at 51%
   throughout and no face clipped at either extreme once the reference box and
   the coefficient were scoped correctly (§1.4).
2. **The shared `JUSTIFIED_ROWS` candidate survived real page use.** Applied
   verbatim to Home's real coda — real media, real aspects — with source order
   and native aspect preserved, no starved cells, no crop, and no page-level
   failure at the 480 → 450 system transition (§11.7).
3. **The display minimum guard engaged for the first time on a real validated
   page.** The typography experiment recorded the minimum as never engaging and
   therefore untested (§16 item 17); Home's own floor engaged at 390px and
   below. This is **HOME-SPECIFIC supporting evidence** that a guard is worth
   keeping — **it establishes no global numerical minimum**, and Home's `40px`
   is no more universal than the experiment's `26px`.

**What is explicitly NOT created by Home's validation:**

- **No global `VIDEO_GRID` rule.** Home's column derivation is one page's answer
  for one nine-item wall; the global maximum remains unresolved (§16 item 6).
- **No global HERO-height rule.** Home's
  `max(240, min(0.72H, 0.62W, 900))` is tuned to Home's opening alone.
- **No universal 40px display minimum.**

**A page validation is not a system rule.** One page consuming a shared
candidate successfully is evidence the candidate works; it is not licence to
lift that page's constants into the system.

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
| 6 | **`VIDEO_GRID` column maximum** — a bound must exist; the number does not. **Home's responsive validation does not supply it.** Home's `3 at ≥1024, 2 below, never one column` is a **HOME-SPECIFIC** derivation for one nine-item wall (`page-specifications.md` §1.7) — it is not a global maximum, not a universal breakpoint contract, and not a rule that `VIDEO_GRID` never reaches one column. Validation still cannot ship without a number. | **Unresolved** |
| 7 | **`AUTOPLAY_VISIBLE` visibility threshold** — what counts as "sufficiently visible". | Unresolved |
| 8 | **Mobile composition for every page** — no reference evidence exists. **Two pages are now validated as candidates:** the Private Project Gate (§11.6, `page-specifications.md` §6.9) and **Home**, from 1440 down to 375 (`page-specifications.md` §1.7). Art Works, Project Detail, About Me and Contact remain pending, and must not borrow either page's derivations — Home's HERO height, wall column rule and display bounds are **HOME-SPECIFIC**. | **2 of 6 validated as candidates; 4 pending** |
| 9 | **All six pages now have a candidate** — Home, Art Works (2C v2), Project Detail (1B v2), About Me (3B v2), Contact (4B v2), Private Gate (5B v2). None is approved. The gate theme conflict was resolved on 2026-09-22 in favour of a route-independent pre-auth surface (`page-specifications.md` §6.3). | **Exploration complete; no candidate conflicts open** |
| 10 | **GALLERY narrow-width behaviour per presentation mode** — the *principle* is approved (§11.5): GALLERY does not inherit GRID child stacking and every mode owes bounded narrow-width behaviour. `VIDEO_GRID` satisfies it via column counts. **`JUSTIFIED_ROWS` now satisfies it** as a shared responsive candidate, system validated (§11.7), and **now consumed successfully at page level by Home** (§11.8, `page-specifications.md` §1.7). Project Detail and Art Works have not been validated with it. **`HORIZONTAL_STRIP` and `SLIDESHOW` still need theirs defined.** | **2 of 4 modes answered; `HORIZONTAL_STRIP` and `SLIDESHOW` pending** |
| 11 | **Display coefficient as a preset property** — `13.3cqw` is tuned to one face; face substitution changes clipping without anyone authoring it (§1.4). **The method question is now answered** by the Display Typography Scaling experiment (§1.4, SHARED RESPONSIVE CANDIDATE — SYSTEM VALIDATED): bounded composition-relative clamp, reference box = the alignment container, coefficient scoped to the preset, wrap rather than shrink, no JS. **What remains open is the numbers, not the method** — no preset's coefficient is derived by that experiment, and the amendment making coefficient and bounds a preset property is still raised rather than applied. | **Method validated at system level; per-preset values still not derived, amendment not applied** |
| 12 | **Bounded HERO overlay content** — the *capability* is approved (ADR-0010): intra-block, title from `projects.title`, closed config, dismissal on media activation, `CLICK_TO_PLAY` or IMAGE only. Its **visual use on Project Detail remains candidate**, and the narrow-width stacked treatment awaits mobile validation. | **Capability approved; visual use candidate** |
| 13 | **Constrained-height behaviour for interactive surfaces** — the Private Gate showed that centring a growing element inside a shrinking viewport pushes its action off screen, and answered it with top-aligned flow below ~620px (§11.6). Whether that becomes a general rule, at what threshold, and for which surfaces, is **not decided on one page's evidence**. | **Evidence recorded on one page; not a system rule** |
| 14 | **Site-wide mobile navigation** — the gate hides the public nav at ≤430 because it has one job and never removes its escape route. Home, Art Works, Project Detail, About Me and Contact each need their own answer. **Explicitly not resolved by the gate, and not to be inherited from it** (§11.6). **Home adds evidence without settling it:** Home’s existing navigation survived 430 / 390 / 375 with density derivation only and no structural change, but its links sit at 14px with a 16px gap — **legible and below a 44px touch target**, with the wordmark wrapping to two lines. **Touch-target sizing is a site-wide question, carried here rather than answered by Home**, and it is **non-blocking** for Home’s responsive candidate status (`page-specifications.md` §1.7). | **Unresolved — now with touch-target evidence** |
| 15 | **`JUSTIFIED_ROWS` carried uncertainties** (§11.7) — `ref = 1.6` remains an **empirical** constant, not a derived one; **2.39 and 0.50 were exercised as labelled geometry probes, not real masters**, and a true cinematic master should be run before specification; and whether the **480 → 450 step** is *desirable* is a visual judgement, not a defect. | **System validated; constants empirical, judgement open** |
| 16 | **`AUTOPLAY_VISIBLE` on one-up `JUSTIFIED_ROWS` rows** — below 700px the mode becomes a single column of native-aspect items. Art Works' one-preview-at-a-time policy will meet those one-up rows at mobile, and the two have **never been validated together**: §11.7's prototype is imagery only. | **Untested interaction** |
| 17 | **Display minimum bound** — the minimum **never engaged** anywhere in the Display Typography matrix (smallest size 35px at 375), so it was carried as a **precautionary preset guard**. **Home's responsive validation is the first case where a minimum actually engaged on a real validated page** — Home's own `40px` floor took effect at 390px and below. That is **HOME-SPECIFIC supporting evidence**: it strengthens the case for *retaining a minimum guard* without establishing any global numerical minimum. **Neither `26px` nor `40px` is a universal threshold** (§1.4, §11.8). | **Guard justified by one real page; no global value** |

| 18 | **Wrapped display typography** — the evidence establishes that long display content **wraps** rather than shrinking (§1.4), but **not what a wrapped display line should look like**. **Line-height for wrapped display type is unresolved, and no maximum line-count policy exists.** | **Unresolved** |
| 19 | **Display typography test material** — the experiment used **uppercase strings at fixed `−0.005em` tracking**, matching current usage. Mixed case changes glyph advance, and tracking changes it too, so **preset coefficient and tracking must be tuned together** and coefficients derived here would not transfer to mixed-case display type. | **Scope limit on the evidence** |

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
