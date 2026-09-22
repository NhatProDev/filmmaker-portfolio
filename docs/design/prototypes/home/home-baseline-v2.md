# Home Baseline v2 — validation report

- **Date:** 2026-09-22
- **Status:** Test record. **No design document is approved by this file, and no
  finding in it is a specification.**
- **Prototype:** `Home Baseline v2.dc.html` (this directory)
- **Superseded prototype:** `legacy/Home Baseline.dc.html`, `legacy/home-baseline.md`
- **Authority used:** `design-direction.md`, `design-handoff.md`,
  `design-system.md`, `page-specifications.md`, ADR-0006, ADR-0008, ADR-0009

## 0. What this is, and what it is not

v2 **recreates the Home candidate that the current repository describes** —
`page-specifications.md` §1.5 — and runs real media through it. It is not a
redesign. No creative decision was reopened: typography, palette, spacing,
block vocabulary and motion policy are taken from `design-system.md` as written.

Findings below are **evidence**. Where a finding contradicts a current document
it is recorded as a conflict with a proposed amendment, and the existing
document stands until the Project Owner / Architect rules. Nothing here is
promoted.

### Relationship to the legacy prototype

The legacy files are preserved unchanged in `legacy/`, apart from one mechanical
edit: relative media paths were rewritten (`./media/` → `../../../../../media/`)
so the archived file still renders from its new location, and a provenance
comment was added above `<x-dc>`. **No finding, value or design markup was
altered.**

v2 is a fresh build, not a copy. Three things in the legacy file were
deliberately **not** carried over:

1. `trimLetterbox` — the CSS scale compensation for baked-in letterbox.
   `design-system.md` §13 forbids shipping it, so v2 shows the untreated truth.
2. The `filmdrift` slow-zoom on poster layers and the `filmlight` looping radial
   glow over the hero. Both are looping animation around already-moving footage,
   which §10.1 forbids without exception.
3. The `image-slot` dependency. v2 uses plain `img` posters so the poster is
   structural (§7.4).

The legacy block order (asymmetric GRID primary, `VIDEO_GRID` alternate) was
**not** adopted. v2 follows the repository: `VIDEO_GRID` is the default example
and the asymmetric GRID is the built alternate.

## 1. Block composition tested

Exactly `page-specifications.md` §1.5. Header and footer are site chrome,
outside the composer.

| # | Block | Configuration as built |
|---|---|---|
| 1 | HERO / VIDEO | full bleed · `clamp(320px, 76vh, 900px)` · `AUTOPLAY_AMBIENT` · `COVER` · caption 13px italic |
| 2 | GRID | display type cols 1–12 · TEXT cols 1–5 · TEXT cols 9–12 |
| 3 | GALLERY `VIDEO_GRID` | 3 columns · 9 cells · 5 moving + 4 still · 4px gutters · 16:9 · `COVER` · `AUTOPLAY_VISIBLE` |
| 4 | GRID | TEXT cols 1–6 + IMAGE cols 10–12 · `align-items: end` · width mode half at mobile |
| 5 | GALLERY `JUSTIFIED_ROWS` | 4 stills · native aspect · one row · full bleed |

**Alternate built and switchable:** asymmetric GRID replacing block 3 — VIDEO
cols 1–7 (2.39:1), VIDEO cols 8–12 (rows 1–2), TEXT cols 1–4, VIDEO cols 5–7
(3:2). The two are mutually exclusive in the prototype, as `design-system.md`
§8.3 advises; they are never rendered adjacent.

**Not built:** `HORIZONTAL_STRIP` — off, per §1.5, because the library holds
fewer than five projects.

`--band` between every media section. Reading columns capped at 46ch.

## 2. Media assets used

Web derivatives in `media/` of the eight clips manifested in
`prototypes/home/MEDIA.md`, plus stills.

| Surface | Asset | Notes |
|---|---|---|
| Hero | `clips/n1.mp4` (10.5s, warm) | poster `w/mtm-atelier.jpg` |
| Wall moving | `n2` (7.1s), `c2` (2.2s), `n3` (2.6s), `c3` (4.4s), `n4` (2.4s) | posters `desk-01`, `desk-03`, `mtm-table`, `nike-court`, `mtm-atelier` |
| Wall still | `mtm-swatches`, `nike-lacing`, `desk-04`, `mtm-sketch` | rest points, part of the pattern |
| About portrait | `w/portrait.jpg` | known-soft asset (see §9) |
| Justified row | `desk-02`, `desk-05`, `mtm-shopfront`, `mtm-mannequin` | native aspect |
| Asym alternate | `c1` (8.0s), `n2`, `c2` | — |

All clips 1280×720 H.264. The clip identities follow the legacy notes; **the
mapping between these web derivatives and the repository's `imgs & videos/`
filenames remains unverified**, exactly as `MEDIA.md` states.

## 3. Typography and palette

**Preset: Title card** — Marcellus 400 display, Newsreader body and UI, display
tracking `-0.005em`. Scale as `design-system.md` §1.5, display at
`clamp(40px, 13.3cqw, 250px)` against a container-query container, not the
viewport.

**Palette: Bone & vermilion** — `#F7F3EC` / `#16120E` / `#C4361C` / `#0C0A08` /
`#EDE7DD`, with `--muted #6C6862`, `--rule #E2DCD2`, `--frame #14110F` applied
as derived values.

Alternates exercised: **Plate**, **Monograph**, **Festival**; **Silver gelatin**,
**Tungsten**. Accent appears exactly three times — wordmark context, the email,
link hover.

## 4. Playback

| Surface | Mode | Observed |
|---|---|---|
| Hero | `AUTOPLAY_AMBIENT` | starts at load with no visibility transition; suspends and releases its source beyond a 200% margin; restarts on return |
| Wall cells | `AUTOPLAY_VISIBLE` | play at ≥20% visible, pause when out, release when far |
| — | `CLICK_TO_PLAY` | not present on Home |

`muted`, `loop`, `playsInline` and `preload` are set from the mode, never
authored per block. **Zero autoplay refusals** across the session. No audible
playback path exists on the page.

Poster resolution as built is `poster → video fades in over it`, structural: the
poster is a sibling `img` beneath the video, and the video's opacity is the only
thing that changes. When a source is released the video goes back to opacity 0
and the poster is what remains — no empty tile at any point.

## 5. Responsive

Breakpoints derived from the **composition container** width: desktop ≥1024,
tablet 640–1023, mobile <640.

| | desktop | tablet | mobile |
|---|---|---|---|
| Wall columns | 3 | 2 | 1 |
| Grid children | authored spans | derived from desktop | full width, `position` order |
| About portrait | cols 10–12 | cols 10–12 | stacked, width mode **58%** |
| Justified row (block 5) | one row, shared height | 2 per row, solved flush | 1 per row, full width |

Measured at 375px: root 375 → portrait 183px, reading column 316px. The portrait
stays an editorial portrait rather than becoming a profile photo, which is the
motivating case in `design-system.md` §5.3 — confirmed.

Display type needed no breakpoint rule at any width: it is sized against its
span, so stacking resizes it by itself.

**Block 5 needed an explicit narrow-width rule — see §8.6.** The automatic
stacking model covers grid children; a `JUSTIFIED_ROWS` row is not a grid child,
and nothing in the fallback reflows it. "Responsive" in the table above is
therefore not uniform across block kinds, and that distinction matters for the
specification.

## 6. Reduced motion

Driven through the prototype's `motion` switch and through
`prefers-reduced-motion` directly. Result: **all playback stopped, every source
released, every poster visible** — a deterministic still, not a slowed loop.
Returning to `auto` restarts the hero through the ready-state re-drive.

The signature light-to-dark transition is **not implemented in v2** — Home has
no project pages to hand off to in this prototype, so §10.2 is untested here.

## 7. Performance

Reported as an environment-bound observation, **not a number to specify**. In
the preview iframe: 3 concurrent 720p streams with the wall in view held ~32fps
with no refusals; sources beyond the near margin were released, so the hero
never competed with the wall. The legacy report's frame-rate figures are not
reproduced or relied on.

The lifecycle (*visible: play · near: prepare · far: pause and release*) is what
keeps the number of live decoders at roughly what is on screen. That behaviour,
not a concurrency constant, is what the prototype demonstrates.

## 8. Findings

### 8.1 Reconfirmed, already invariant — no change proposed

- **Ambient playback must be re-driven when a source becomes ready.** Observed
  twice, and both times it failed silently into a dead poster before the fix.
- **`playsInline` must be a property or a real attribute value.** Set as both.

### 8.2 Reconfirmed advisory, unchanged

- **Clips under ~4s read as GIFs in a wall cell.** `c2`, `n3`, `n4` (2.2–2.6s)
  all do; the cut becomes the subject.
- **A clip opening near-black should not take a small tile.** `n2` in a
  three-column cell reads as a hole for part of its loop.
- **One moving field per viewport held** at all three widths, carried by
  `--band`. No scroll position put the hero and the wall in one view.
- **Tight 4px gutters are what make the wall a contact sheet.** Unchanged.

### 8.3 New observation — letterbox, with a correction to how it is described

Batch-one clips carry baked-in letterbox; v2 ships **no** compensation, so the
bars render inside the 16:9 cells, most visibly on `c3` at mobile. This
confirms the §7.5 requirement and the §13 prohibition; the method stays
unresolved.

**Correction worth recording:** with no compensation there is **no poster-to-video
scale jump**. The ~12% jump in the legacy report was produced *by* the CSS trim —
video scaled, poster not. The jump is evidence about the workaround, not about
the assets. The requirement that a chosen method apply identically to poster and
video (ADR-0009 §3) is unaffected and still right.

### 8.6 Finding — safe stacking does not cover GALLERY flow blocks

At 375px the single-row `JUSTIFIED_ROWS` gallery left its 4:5 still at **45×176**
— a sliver, with its aspect destroyed by the shared row height. The automatic
fallback in `design-system.md` §11.2 stacks **grid children**; this row is one
block whose internals are arranged by a rule, so no grid child ever stacks and
nothing reflowed.

This is a real gap between §11.2's promise ("a page nobody has given mobile
attention still renders readably") and what the fallback actually reaches. It is
not specific to this composition — any `JUSTIFIED_ROWS` block with a
wide-plus-narrow mix hits it.

Fixed in the prototype by **solving each wrapped row as a justified row** rather
than by wrapping at equal widths: for a chunk of cells with aspects `aᵢ` in a row
of width `W` with gap `g`, `h = (W − g(n−1)) / Σaᵢ`, and each cell takes `aᵢ·h`.
Every row is then flush by construction and every cell in it shares one height,
which is the pattern reference 3 actually shows (`page-specifications.md` §2.5:
within a row images share a height and keep native aspect; rows differ in
height). Chunks are 2 per row at tablet and 1 at mobile, matching the wall's
3 / 2 / 1 fall.

**An equal-width wrap was tried first and rejected**, because equal widths with
unequal aspects give unequal heights, and the void beside the shorter cell reads
as broken alignment rather than as the load-bearing negative space of §4.3. Worth
recording: the naive fix breaks the half of the pattern that is easiest to miss.

Measured after the solve — tablet 909px: two rows, each filling the width, cells
sharing 232px and 350px; mobile 375px: four full-width rows at native aspect;
desktop unchanged at one row of 176px.

**[amendment proposed — not applied]** The responsive fallback must specify
**per-presentation-mode narrow-width behaviour for GALLERY**, alongside the
existing per-breakpoint column counts for `VIDEO_GRID`. For `JUSTIFIED_ROWS`
that behaviour is items-per-row plus a justified solve, not a stack. Against
`design-system.md` §11.2 **[INVARIANT]** — it extends the guarantee's reach
rather than weakening it — and adds an item to §16.

### 8.7 Observation — nine cells leaves an orphan at tablet

The repo's wall config is 9 cells at 3 / 2 / 1. At tablet the nine cells fill
four rows of two and leave the ninth alone beside an empty cell. The prototype
is rendering the config faithfully; the config is what produces the hole.

A count that divides by both 3 and 2 (6 or 12) avoids it, as would allowing the
last cell to span. Recorded, not decided — it belongs with `design-system.md`
§16 item 4 (wall cell count and still/moving ratio, still to be retested
against a fuller library).

### 8.4 Conflict — the display coefficient is face-dependent

`design-system.md` §1.1 holds it **[INVARIANT]** that no composition may depend
on the metrics of one typeface, and §1.4 carries `13.3cqw` as a **[DEFAULT]**.

Observed: at the same container width, `PORTFOLIO` fits inside 12 columns in
**Title card** (Marcellus) and **overflows and clips at the right edge** in
**Monograph** (Spectral) and **Festival** (Archivo). The coefficient is tuned to
one face and to a nine-character string.

Clipping display type is permitted (§6 of `design-direction.md`), so this is not
a defect on its face — but it is currently **accidental rather than authored**,
and it changes per preset without anyone choosing it.

**[amendment proposed — not applied]** Make the display coefficient a **preset
property** alongside tracking, so face substitution carries its own optical
adjustment, per §1.1's own rule. Against `design-system.md` §1.2 / §1.4
**[DEFAULT]**; the **[INVARIANT]** container-relative principle is untouched.

### 8.5 Observation — wall column counts are derived, not authored

The prototype computes 3 / 2 / 1 by measuring the composition container. That
matches the container-relative principle, but production validates column counts
**per breakpoint** (§8.2, ADR-0008). The two must not be confused: the prototype
demonstrates the behaviour, the schema owns the bound. **The `VIDEO_GRID` column
maximum is still unset** (§16 item 6) and v2 does not propose a number.

## 9. Compromises in this build

Carried, not solved. All are content gaps already on record.

- **Posters are unrelated stills, not frames from their own clips.** This is the
  single largest visual compromise: the poster-to-video swap is a content change,
  not just a motion start.
- **The About portrait is a soft screenshot crop.** A master file is outstanding.
- **Only four clips are ≥4s**, so the still/moving ratio was again constrained by
  the library, exactly as §8.4's advisory warns. The 5 + 4 split is not re-tested
  evidence.
- **No project transition**, no project detail page to hand off to.
- **Centre crop everywhere** — focal point is deferred (§7.6), and the nike court
  cell shows the consequence at wide ratios.

## 10. Verdict against the three questions

- **Visually coherent** — yes. Media dominates, chrome is a line of type, one
  bold gesture per view, the accent appears three times, negative space holds.
- **Composer-representable** — yes. Five blocks of canonical types, one level of
  nesting, logical column placement only, DOM order equals `position`, no block
  depends on a neighbour, the alternate is a configuration rather than a variant
  page.
- **Responsive** — yes **for grid-composed blocks**, where the automatic stack
  was observed working and one width-mode override was exercised. **Not
  automatically, for GALLERY flow blocks** — block 5 required an explicit
  narrow-width rule (§8.6), and that gap is a specification item, not a
  prototype detail. Mobile has been *observed*, not *designed*; §11.3 still
  applies.
- **Ready to remain the candidate** — yes, as a **candidate**. Nothing here
  promotes it, and the four open items that block approval are unchanged:
  letterbox method, focal point, `font-ui`, and the `VIDEO_GRID` column maximum.
