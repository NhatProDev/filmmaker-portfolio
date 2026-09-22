# Design handoff — Filmmaker Portfolio V1

**Status: candidate visual language. Not approved.** This document records what
the Home exploration currently *is*, so that `design-system.md` and
`page-specifications.md` can be authored from it. It is not a specification and
it is not production code.

Source of truth for the visuals: `Home Baseline.dc.html`.
Test findings and their evidence: `home-baseline.md`.
Governing decisions: `design-direction.md`, ADR-0004, ADR-0006, ADR-0007, ADR-0008.

> **⚠ Evidence status — governance audit, 2026-09-22.**
>
> **Both cited sources are missing.** `Home Baseline.dc.html` and
> `home-baseline.md` are not in this repository, nor in its parent directory,
> Downloads, Documents or Desktop. No `*.dc.html` exists anywhere searched.
>
> Every measurement below — frame rates, the ~12% poster/video scale jump,
> letterbox bar dimensions, the fps figure for concurrent streams — is therefore
> **reported but unverifiable**. It is retained as **historical evidence of what
> testing found**, and is deliberately preserved rather than deleted.
>
> **No unverifiable measurement here is a specification.** `design-system.md`
> §0.1 records how this affects rule grading, and §17 lists the rules that were
> downgraded as a result. Contrast ratios were the exception: they were
> recomputed from the documented hex values and verified independently.
>
> If the prototype is recovered, propose `docs/design/prototypes/home/` as its
> canonical location and re-verify before promoting any measurement.

### How to read `[test finding]`

Items marked **[test finding]** come from running real footage and stills
through the prototype. They are **evidence, not authority.**

A test finding does **not** override `design-direction.md`, and it does not
become specification by being written down here. Where testing contradicts an
existing direction, this document does four things and stops: records the
conflict, states the evidence, proposes an amendment, and marks it as awaiting
**explicit Project Owner / Software Architect approval**. Until that approval,
the existing direction stands and the finding is advisory.

Testing informs governance. It does not bypass it. Anything below that would
amend an approved artifact is flagged **[amendment proposed]**.

---

## 1. Typography

Four presets were built and compared. **Title card** is the current candidate.

| Role | Current | Notes |
|---|---|---|
| `font-display` | Marcellus, 400 | Inscriptional Roman capitals. One weight only, caps-and-display use only — its lowercase is weak. |
| `font-body` | Newsreader, variable 200–600, optical size 6–72 | Carries every reading surface. Real ink texture; the optical axis tightens the face as it shrinks. |
| `font-ui` | Newsreader | Navigation currently shares the body serif. |

Alternates tested and kept in the preset set: **Plate** (same, but Archivo for
`font-ui` — the test of whether navigation should leave the serif),
**Monograph** (Spectral throughout, one family), **Festival** (Archivo display
+ Newsreader body — the serif/sans departure permitted under §5 path B).

### Scale

The scale is a **ratio system tied to container width, not a pixel ladder.**

- **Display** is sized in container-width units: `clamp(40px, 13.3cqw, 250px)`
  on a container that spans the full 12 columns. "Oversized" therefore means
  *a proportion of its grid span*, so the same block survives a respan, a
  reorder, and mobile stacking with no breakpoint table. This is the single
  most important typographic decision in the system — do not reimplement it as
  viewport units.
- **Statement / pull quote**: `clamp(26px, 3.2vw, 56px)`, line-height 1.1.
- **Body**: `clamp(15px, 1.06vw, 18px)`, line-height 1.74.
- **Secondary body / captions in flow**: `clamp(14px, 0.98vw, 16px)`.
- **Section labels**: `clamp(14px, 1vw, 17px)`, italic, muted.
- **Media captions (over footage)**: 13px italic.
- **Identity mark (nav)**: `clamp(10px, 0.74vw, 12px)`, 0.22em tracking, caps.
- **Meta (years)**: 12px.

Display tracking is per-face and belongs to the preset, never to the layout:
Marcellus `-0.005em`, Spectral `-0.02em`, Archivo `-0.035em`.

### Casing

Caps are **deliberate and rare**, not a label style.

- Permitted: the identity mark, the oversized wordmark, project titles.
- Not permitted: section labels, navigation items, metadata, buttons, any
  eyebrow above a heading.

Section labels are sentence-case italic in the body serif. This is the line
between "evidenced all-caps" (references 1, 2, 4) and reflexive label-casing.

### Measure and leading

- Reading column ≤ 46ch. Statement/pull-quote ≤ 24ch.
- Serif body takes 1.74 line-height. A sans body would take less; the preset
  owns that adjustment, not the layout.
- Text is never full-viewport-width and never centred as a default.

---

## 2. Colour

```text
--surface       #F7F3EC   warm off-white, browsing ground
--ink           #16120E   near-black, warm
--muted         #6C6862   derived foreground, 5.0:1 on surface
--rule          #E2DCD2   hairline
--accent        #C4361C   restrained vermilion, 4.9:1 on surface
--surface-dark  #0C0A08   project environment, derived from ink
--ink-dark      #EDE7DD   foreground on dark
--frame         #14110F   empty media well
```

Two alternate palettes exist and are switchable: **Silver gelatin** (cooler,
`#F1F1EE` / `#121314` / `#B02E22`) and **Tungsten** (`#F0E7D9` / `#1B1510`).
On Tungsten the vermilion lands at 4.4:1 and is therefore **display-size only**
— worth encoding as a validation rule, not a note.

`--muted`, `--rule` and `--frame` are **derived**, not admin-set. Derivation:
muted ≈ ink at 62% over surface; rule ≈ ink at 14% over surface; frame ≈ ink
darkened. Keep the derivation, not the literals.

### Where the accent goes

Exactly three uses on Home: **the wordmark, the email, link hover/focus.**
Nowhere else. No accent-tinted component family, no secondary accent, no
semantic ramp, no accent fills, never on body text.

The colour on the page comes from the footage. The interface supplies the
quiet. If a page needs a fourth accent use, the answer is almost always that
something else should be removed.

---

## 3. Layout

**12 logical columns.** `colStart >= 1`, `colSpan >= 1`, `colStart + colSpan <= 13`
(ADR-0006 §2).

```text
--edge  clamp(24px, 3.2vw, 56px)    page margin
--gut   clamp(10px, 0.9vw, 20px)    column gutter
--band  clamp(72px, 9vw, 170px)     vertical space between media sections
```

Media gutters inside a gallery are **4px**, not `--gut`. Tight gutters are what
make a wall read as a contact sheet instead of a grid of cards.

### Negative space

Load-bearing. Large unfilled regions are correct output. The About section
deliberately leaves roughly two-thirds of its grid empty; do not backfill it.

`--band` is not decoration either — it carries the **one-moving-field-per-
viewport** density default (see §6). Compressing it is what pushed the page
toward a feed in testing. Treat it as a recommended minimum gap between
adjacent media blocks, warnable in the composer rather than hard-blocked.

### Full bleed

Media runs to the viewport edge by default. Bleed is a block property
(`bleed: none | right | both`), implemented as a negative margin equal to
`--edge`, not as an escape from the grid. Text is contained; media is not.

### Asymmetry

Available, not compulsory. Unequal spans, deliberate offset and staggered rows
are encouraged where they create hierarchy. The current asymmetric field:

```text
GRID
├── VIDEO  cols 1–7   row 1     2.39:1
├── VIDEO  cols 8–12  rows 1–2  tall
├── TEXT   cols 1–4   row 2
└── VIDEO  cols 5–7   row 2     3:2
```

One level of nesting only. Rows need not column-align with one another.

### GALLERY vs GRID

`GRID` = manual composition, specific items in specific places.
`GALLERY` = a rule arranging an ordered sequence. Never merge them
(ADR-0008 §2).

---

## 4. Home — an example composition

**This is one arrangement of blocks, not a template.** The CMS may reorder,
remove, duplicate, replace, hide, or reconfigure every block below. Nothing
here is positional law. The sequence exists to demonstrate rhythm:

> large moving image → quiet → cluster of previews → text → quiet media coda

| # | Block | Configuration |
|---|---|---|
| 1 | HERO / VIDEO | full bleed, `clamp(320px, 76vh, 900px)`, `AUTOPLAY_ALWAYS` (rename proposed, §5) |
| 2 | GRID | display type cols 1–12; TEXT cols 1–5; TEXT cols 9–12 |
| 3 | GALLERY `VIDEO_GRID` | 3 columns, 9 cells, 5 moving + 4 still, 4px gutters, `AUTOPLAY_VISIBLE` |
| 4 | GRID | TEXT cols 1–6 + IMAGE cols 10–12, `align-items: end` |
| 5 | GALLERY `JUSTIFIED_ROWS` | stills at native aspect, one row, full bleed |
| 6 | Footer | site chrome, not a block |

> **Naming note — `AUTOPLAY_ALWAYS` is historical.** The current approved name
> is **`AUTOPLAY_AMBIENT`** (ADR-0008, renamed by Project Owner / Architect
> decision on 2026-09-22). This document predates that decision; its original
> wording is retained unchanged for provenance. Read every `AUTOPLAY_ALWAYS`
> below as `AUTOPLAY_AMBIENT`. See §10, amendment 1.

Header and footer are **site chrome and live outside the composer.**

Two alternates are built and switchable:

- **Asymmetric GRID** replaces block 3. The two are mutually exclusive and must
  never sit adjacent — a wall and an asymmetric field in the same scroll is the
  failure mode that turns the page into a content platform.
- **GALLERY `HORIZONTAL_STRIP`** (currently off). It needs **five or more
  projects** to work; below that it stops overflowing, the clipped-at-both-edges
  signal disappears, and it reads as dead space. **[test finding]** Card width
  must be a strip setting tuned against item count, not a constant.

---

## 5. Media

### Video behaviour (ADR-0008 §3)

| Context | Mode |
|---|---|
| Home hero, standalone ambient | `AUTOPLAY_ALWAYS` — see naming note below |
| Every multi-video surface | `AUTOPLAY_VISIBLE` |
| Primary project film | `CLICK_TO_PLAY` |

Muted is forced in both autoplay modes. No controls on autoplay surfaces.
Lifecycle is **visible: play · near: prepare · far: pause and release**.

#### Naming — [amendment proposed], requires architecture approval

**[test finding]** A standalone ambient hero can suspend when far enough
off-screen with no perceptible loss, and doing so measurably helps: the
off-screen hero was one of seven concurrent streams at ~22fps and bought
nothing. `AUTOPLAY_ALWAYS` therefore describes behaviour the surface should not
actually have, and the name will mislead whoever implements it.

Recommend renaming the conceptual mode before implementation to
**`AUTOPLAY_AMBIENT`** (preferred) or `AUTOPLAY_STANDALONE`, with semantics:

- starts automatically on a standalone ambient video surface
- muted, inline
- **may** suspend and release resources when sufficiently off-screen

`AUTOPLAY_VISIBLE` (multi-video surfaces) and `CLICK_TO_PLAY` (primary
intentional playback) are unchanged. This is a rename of an ADR-0008 enum
member and its structural placement rules carry over untouched. No runtime
change is proposed here.

**[test finding]** ~4 seconds is a **strong default minimum** for preview and
wall footage. Below that the cut becomes the subject and the tile reads as a
GIF. It is a review guideline, not a validation rule — a deliberately short
loop that has been looked at and approved is fine.

**[test finding]** A clip whose opening seconds are near-black **should not go
in a small tile** — most of its loop reads as a hole in the grid. Large cell,
or trim the in-point. Also a review guideline.

### Still images

No card chrome anywhere: no container, border, shadow, elevation, padded frame
or hover lift. Media sits directly on the ground.

### Aspect ratio

Native aspect is preserved. Media is not cropped to a uniform tile to
regularise a grid. Mixed aspect ratios in one composition are expected.

Exception, and it is a real one: `VIDEO_GRID` is a cell geometry, so its tiles
share a ratio (currently 16:9). The `HORIZONTAL_STRIP` likewise shares a ratio
(2:3). These are the two admitted uniform surfaces.

### fit — per surface, not global

`fit` is a per-block property (ADR-0008 §3). There is no single correct value.

**`COVER` — the default** for editorial media surfaces: `VIDEO_GRID` and
preview walls, gallery cells, the horizontal strip, hero surfaces, and any
deliberate editorial crop. These are compositions where the frame is chosen and
overflow is intended.

**`CONTAIN` — supported and correct** wherever cropping would destroy essential
content: primary project films, archival material, screenshots and captured
UI, graphics and title cards, and any asset the administrator has deliberately
framed. A film the visitor sits down to watch is shown whole.

The guidance is to reach for `COVER` first on browsing surfaces and `CONTAIN`
first on viewing surfaces — not to pick one value for the site.

### Letterbox — unresolved and blocking

**[test finding]** The first clip batch carried baked-in letterbox: one clip was
2.34:1 content inside a 16:9 file (87px bars), the others 2.0:1 with ~40px bars.
The second batch had none. `cover` therefore renders black bars *inside* the
frame on affected assets.

The prototype compensates with a CSS scale (`trimLetterbox`). **That must not
ship.** Ingestion must detect and strip letterbox on upload, or store an
active-area crop per asset.

### Posters

`media.thumbnail_url` today.

**Recommended V1 enhancement — requires architecture approval:** an
administrator-selected poster, held relationally rather than as a media UUID in
`config` (a reference inside JSON is invisible to the CLAUDE.md §12
`MEDIA_IN_USE` guard). **The schema is not designed here.** ADR-0008 §7 already
records this as a deferred enhancement; the testing below is the case for
reconsidering its priority, not a decision to adopt it.

Three independent arguments accumulated during testing:

1. Posters are what a visitor sees during fast scroll, autoplay refusal, the
   released state, and reduced motion. On a wall the poster *is* the
   composition most of the time.
2. An auto-generated first frame is frequently black, a slate, or motion blur.
   One clip in the current set opens on near-darkness for a third of its
   duration.
3. Whatever trims letterbox from the video must trim the poster identically, or
   the poster→video swap produces a visible scale jump (~12% on the worst clip).

A refused autoplay must show the poster, never an empty tile. Poster fallback
should be **structural** — the poster sits beneath the video and the video
fades in over it — not scripted.

### Focal point

**[test finding]** Under consideration and increasingly necessary: normalised
`focalX` / `focalY` (0–1) on the media row, applied as `object-position`. The
same cover is framed at 2:3, 2.39:1, tall, and 16:9. A centre crop decapitates
roughly half the current library — one Nike cover degrades to an abstract teal
field with part of a shoe. Do not assume still-image framing transfers to
moving footage.

---

## 6. Motion

**Content motion is encouraged. Interface motion is restrained.** The footage
moves; the interface around it does not.

Forbidden, without exception: hover lifts, card scale effects, staggered
entrance animations, fade-and-slide-up on scroll, parallax as decoration,
scroll-hijacking, looping animation on interface elements, animated chrome
around already-moving footage.

Permitted: motion that answers a user action and shows what changed.

### The density default

**[test finding]** The variable that breaks the identity is not the number of
videos on the page. It is **the number of separately-framed moving fields in
one viewport.** A tight-gutter wall of nine tiles reads as *one* field — the eye
takes it the way it takes a strip of negatives. Two differently-shaped moving
fields in one viewport is where it tipped.

Treat **one moving field per viewport height** as a strong editorial default,
carried by `--band`. It is not a system invariant: a deliberate exception that
has been visually reviewed and is performance-safe is legitimate. The composer
should surface the condition, not forbid it.

### Signature transition

One moment owns the site's sense of motion: **light-to-dark project entry.**
The clicked frame flies to full bleed while a dark curtain wipes up from below;
the project title holds as a title card; then it reverses into the project page.
Paper becomes cinema, and the media is handed off rather than cross-faded.

It is owned by the **shell, not the block** — delegated from any element
carrying a project reference — so it survives reorder, duplication and deletion.

Timings as built: curtain 720ms, frame flight 760ms, title in at +720ms,
`cubic-bezier(.76, 0, .24, 1)`.

### Reduced motion

`prefers-reduced-motion` produces a **deterministic still**, not a shortened or
slowed animation. All video paused on its poster; the signature transition
becomes a hard cut with the same hold. Checked *before* playback starts.

---

## 7. Responsive

Three fixed breakpoints (ADR-0006 §5). Desktop composes explicitly; tablet
derives; mobile safe-stacks unless explicitly overridden.

**Remains at every size:** the light-browse / dark-project model, media
dominance and full bleed, the oversized display gesture, the reading measure,
the accent discipline, the signature transition.

**Simplifies:** overlap and extreme asymmetry reduce where they harm
readability. Asymmetry is available at every size but owed to none.

**Stacks:** every grid child falls to full width in `position` order. This
safe stacking is the **automatic architectural fallback** — it is computed, not
authored, so a page nobody has given mobile attention still renders readably
rather than breaking.

That guarantee is a floor, not a substitute for design. **Every production page
still requires a mobile design review**, and optional per-breakpoint overrides
exist to refine the fallback where review shows it is merely adequate. "Mobile
must be designed" means the review is required; it does not mean the
architecture lacks automatic derivation.

**Oversized typography adapts by itself.** Because display type is sized in
container-width units, stacking to one column resizes it correctly with no
breakpoint rule. This is why the unit choice matters.

**Video walls reduce density by column count:** 3 / 2 / 1 across desktop /
tablet / mobile. A four-column wall on mobile is both unreadable and a decode
disaster. Column counts must be bounded by validation at every breakpoint.

**One placement property beyond column spans is required:** a **width mode**.
The About portrait at mobile would otherwise stack to full width and become a
profile photo; it needs a half-width cap. ADR-0006 §4 already lists width mode
in the placement vocabulary — implement it.

---

## 8. Recurring visual patterns

Patterns, not components. **None of these is a card.** Do not introduce a
reusable card primitive *in the public portfolio visual language* — that is the
single fastest route to making this page look like a product.

**Scope note.** This rule governs the public site only. The **Admin CMS has an
intentionally separate, function-first visual system** (CLAUDE.md §13) and is
free to use reusable panels, cards, tables and any other conventional
application furniture. Nothing in §1–8 of this document constrains it.

1. **Navigation line** — identity mark in tracked caps at cols 1–5, destinations
   right-aligned at cols 7–12, aligned to the same 12 columns as content. Not
   sticky. No rule. No mega-menu, no pill, no frosted panel, no arrows.
2. **Oversized display type** — fit to its column span in container-width units.
   May be clipped by the viewport, overlapped by media, or set as the page's
   single bold move. One per view.
3. **Media wall** — uniform cell geometry, 4px gutters, full bleed, no captions,
   no chrome, mixed moving and still cells. Still cells are rest points and are
   part of the pattern, not a fallback.
4. **Asymmetric media/text composition** — unequal spans across two rows, one
   text child among media children, staggered so rows do not align.
5. **Editorial text section** — measured column off-centre, large deliberate
   void, optional IMAGE at the far columns bottom-aligned to the text baseline.
6. **Horizontal strip** — equal-ratio covers, clipped at both viewport edges,
   drag or wheel to scroll, title and year beneath each. Needs 5+ items.
7. **Media caption** — 13px italic, bottom-left, inside the frame, on the
   footage. Used sparingly; not every video needs one.
8. **Project transition** — see §6.

---

## 9. Theme customization

### Immutable — category A, not configurable under any theme

Media-first; restrained chrome; one primary element per view; asymmetry as a
tool not a default; load-bearing negative space; native media presentation;
cinematic project pages; type as an active compositional element; the public
site is never product UI; the accessibility floor.

Also immutable: **layout, grid behaviour, spacing and type *ratios*, motion
behaviour and timing, media treatment, the light-browse / dark-project model,
and luminance polarity.**

### Configurable — category B

Five colours (`surface-light`, `ink-light`, `accent`, `surface-dark`,
`ink-dark`) and three typeface roles (`font-display`, `font-body`, `font-ui`),
chosen from a supported, self-hosted library. Presets are starting points, not
a closed set.

Everything else derives. **Changing the theme must never rewrite block config,
and block config must never carry a colour or a typeface.**

A custom theme that departs from the default direction must still preserve all
five of: accessibility, contrast, clear hierarchy, media dominance, and
editorial character. That is a gate, not a preference.

---

## 10. Open design questions

Only items that genuinely need visual testing.

1. **Focal point** — does a single normalised focal point per asset survive
   2:3, 2.39:1, tall and 16:9, or does the system need per-container framing?
   Needs testing against ten or more real covers, not four.
2. **Letterbox handling** — detect-and-strip at ingestion, or a stored
   active-area crop? Affects what the CMS must show the administrator.
3. **`font-ui`** — does navigation leave the serif? Compare *Title card* against
   *Plate*. Unresolved; both read well.
4. **Wall cell count and still/moving ratio** — 5 moving + 4 still currently
   reads best, but that was constrained by having only five eligible clips.
   Re-test with a fuller library.
5. **Overlap primitive** — deferred. Requires GRID to allow two children on one
   row with overlapping column ranges and a bounded two-layer stacking order.
   Not a V1 blocker; the hero works without it.
6. **Project page, Art Works, About, Contact** — not designed. Only Home has
   been explored.
7. **Mobile composition** — no reference evidence exists for any page. The
   architecture provides an automatic safe-stack fallback, so no page is ever
   unreadable by default; every production page still requires a mobile design
   review, and explicit per-breakpoint overrides may refine the fallback where
   that review finds it merely adequate.
8. **Private-project interstitial** — a title card, not a login screen.
   Composition untested.

### Carried implementation requirements

Two prototype findings that are implementation constraints, not design choices:

- **Playback must be re-driven when a source becomes ready after mount.** It
  cannot depend solely on IntersectionObserver transitions — a standalone
  ambient surface is never observed, so a source arriving late never starts.
- **`playsInline` must be set as a property or a correctly emitted boolean
  attribute.** A JSX-style empty-string attribute is falsy and gets stripped,
  which silently breaks iOS autoplay on every surface. Desktop testing cannot
  detect this.

### Amendments proposed here — and their outcomes

These were proposals at the time of writing, when none was in effect. **All five
have since been resolved** by the Project Owner / Software Architect.

The rows are retained as the record of what this exploration proposed. **The
Outcome column is the authoritative status**; the Proposal column is history.
Prose elsewhere in this document still reflects the pre-decision state and is
preserved deliberately as candidate evidence — where it disagrees with an
outcome below, the outcome wins.

| # | Proposal | Against | Outcome |
|---|---|---|---|
| 1 | Rename `AUTOPLAY_ALWAYS` → `AUTOPLAY_AMBIENT`, permitting off-screen suspend | ADR-0008 §3 | **Approved and applied.** Renamed in ADR-0008 on 2026-09-22. `AUTOPLAY_AMBIENT` *may* suspend off-screen; the structural placement rules carried over untouched. The name `AUTOPLAY_ALWAYS` is dead — do not implement it. |
| 2 | Reconsider priority of administrator-selected poster media for V1 | ADR-0008 §7 | **Approved via ADR-0009.** Now a V1 requirement, held relationally as `media.poster_media_id`, never as an id in `config`, and participating in `MEDIA_IN_USE`. Resolution order `poster_media_id → thumbnail_url → empty well`. Schema work specified but **not yet applied**. |
| 3 | Add a focal-point field to the media model | new | **Deferred by Architect.** Do not add `focalX` / `focalY` — `design-system.md` §7.6. Pending testing against a larger real library; the interim mitigation is editorial. |
| 4 | Handle baked-in letterbox at ingestion | new | **Requirement approved; method unresolved.** Detect-and-strip at ingestion vs a stored active-area crop is still open — `design-system.md` §16 item 1. CSS compensation must not ship. Whichever method is chosen must apply identically to a poster and its video (ADR-0009 §5). |
| 5 | Add a **width mode** placement property (needed for the About portrait at mobile) | ADR-0006 §4 | **Confirmed.** Already present in ADR-0006 §4's placement vocabulary; no amendment was required. Implement it. |

---

## Content still outstanding

- A master file for the About portrait — the current asset is a crop out of a
  screenshot and is soft at display size.
- A project name for the desk/archive film, captioned "Untitled (desk film)".
- Poster frames drawn from each clip rather than unrelated stills.
- A cover for Tokyo in the horizontal strip.
