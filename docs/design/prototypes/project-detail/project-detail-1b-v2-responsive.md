# Project Detail — 1B v2 responsive validation

## 000. Locked responsive findings

Accepted by the Project Owner on 2026-09-23.

**Status: RESPONSIVE VALIDATED — candidate.**
**Not** Design Approved · **not** production-ready · **not** implementation complete.

No design document, spec, ADR, schema or OpenAPI change is made by this record.
`Project Detail 1B v2.dc.html` and `project-detail-1b-v2.md` are **not
rewritten** — the locked desktop candidate remains historical evidence.

### HERO

1. **Fit: COVER → COVER.** Poster and playback use the same fit.
2. Controlled same-frame evidence: **no activation reframe** under cover → cover.
   **cover → contain is rejected** — activation visibly reframes.
3. Encoded black bars inside the source video remain **untouched**. **No CSS
   compensation.** Structural letterbox handling is an engineering /
   media-pipeline question.
4. **Phone HERO below 700px:** `h = max(0.5417 × W, 0.30 × H)` —
   430×932 → ~280px · 390×844 → ~253px · 375×812 → ~244px.
   **Project-Detail-specific.**

### Project stills

5. The former JUSTIFIED_ROWS treatment is **no longer used by Project Detail**.
   This is **not** a rejection of the shared JUSTIFIED_ROWS system candidate.
6. For this fixed set of four similarly-wide stills, a **Project-Detail-specific
   STRUCTURED GRID**: ≥ 1024 → 4 columns / 1 row · 700–1023 → 2 columns / 2 rows
   · < 700 → 1 column.
7. Preserved: source order · native aspect · no crop · no hiding · no reordering.
8. The **3 + 1 state is historical / rejected** responsive evidence (§0.3).

### Dynamic project titles

9. Dynamic project-name strings use **NEWSREADER** — at minimum the HERO title
   and the next-project title.
10. Reason: Marcellus does not provide reliable Vietnamese glyph coverage for
    dynamic project names and produced **per-glyph fallback inside words**.
11. Static Latin Marcellus usage elsewhere is **not changed**.
12. Project Detail Newsreader candidate:
    - **Project title** — `9.094cqw`, min **27px**, max **80px**
    - **Next-project title** — `6.913cqw`, min **27px**, max **53px**
    - Reference box: the Project Detail alignment composition (§00.6).
13. **Not promoted globally.**

### Long title

14. Overlay only when: rendered title **≤ 2 lines** · play affordance **clear** ·
    Back to Works **clear**. Otherwise → **stacked below the film, at any width.**
15. Never shrink-to-fit by string length · never truncate · never reduce the
    coefficient because a title is long.

### Line height

16. **0.98** remains the Project Detail candidate.
17. Tested Vietnamese samples rendered **without collision**.
18. More pathological stacked-diacritic combinations remain a
    **typography-preset QA concern** — non-blocking.
19. **0.98 is not promoted** as a universal display line-height.

### Preserved as validated

Metadata / statement layout · supporting video + caption · credits · coda ·
footer · Back to Works tap treatment · ADR-0008 playback semantics · ADR-0010
activation dismissal · no horizontal overflow · full-page responsive rhythm.

### Open — non-blocking

- Structural handling of encoded letterbox bars
- Admin-selected poster must match playback geometry
- Site-wide mobile navigation
- `AUTOPLAY_VISIBLE` threshold
- Exact breakpoint reconciliation around 600 / 700, if later cross-page
  evidence requires it
- Vietnamese multi-line line-height — preset QA

**None blocks Project Detail responsive maturity.**

---

## 00. Pass 3 — final hardening (2026-09-23)

Applies four **locked Owner decisions**, then revalidates only the hero, the
stills, the dynamic-title preset and their interaction. Everything else stays as
pass 1 / pass 2 recorded it. The prototype's defaults now match the decisions.
The pre-decision states stay available as comparison tweaks: `heroFit`,
`poster`, `stillsMode: justified`, `titleFace: marcellus`.

### 00.1 Hero — COVER → COVER (Decision 1)

- Default fit is `cover-cover` for the poster and for playback. The default poster is c1's own frame, captured at runtime (pass 2 §0.4).
- Activation scale is **×1.000** at 1440×1000, 1440×600, 768×1024 and 390×844, so nothing reframes on play.
- c1's encoded bars (87px top and bottom) are **not compensated**. Under cover, 21–24% of the hero area is still encoded black at the standard viewports. At 1440×600 cover crops the bars fully (0% black) and shows 76% of the picture.
- The letterbox pipeline is still an open engineering question. It no longer blocks this page.

### 00.2 Phone hero — locked (Decision 2)

`W < 700 : h = max(0.5417 W, 0.30 H)` (Project Detail only)

| Viewport | Hero | Share of first screen |
|---|---|---|
| 430×932 | **280px** | 30% |
| 390×844 | **253px** | 30% |
| 375×812 | **244px** | 30% |

600×900 stays on the width term (325px). ≥ 700 unchanged.

### 00.3 Stills — structured grid (Decision 3)

Project Detail block 3 is now a **structured grid**. It replaces JUSTIFIED_ROWS on this page only, and the shared candidate is untouched. Columns are 4 at ≥ 1024, 2 at 700–1023 and 1 below 700. All columns are the same width. Each still takes its height from its own aspect: no crop, no reorder, no masonry, cells top-aligned, 4px gap, full bleed (as locked).

| W | Cols × rows | Cell w | Heights (in order) | Max Δh in a row | Aspect | Order | Block h |
|---|---|---|---|---|---|---|---|
| 1440 | 4 × 1 | 357 | 175 / 177 / 175 / 175 | 2px | Δ 0.01% ✓ | ✓ | 177 |
| 1024 | 4 × 1 | 253 | 124 / 126 / 124 / 124 | 2px | ✓ | ✓ | 126 |
| 768 | 2 × 2 | 382 | 187 / 190 · 187 / 187 | 3px | ✓ | ✓ | 381 |
| 600 | 1 × 4 | 600 | 294 / 298 / 294 / 294 | — | ✓ | ✓ | 1192 |
| 430 | 1 × 4 | 430 | 211 / 214 / 211 / 211 | — | ✓ | ✓ | 858 |
| 390 | 1 × 4 | 390 | 191 / 194 / 191 / 191 | — | ✓ | ✓ | 779 |
| 375 | 1 × 4 | 375 | 184 / 186 / 184 / 184 | — | ✓ | ✓ | 750 |

- The one ragged edge is `mtm-shopfront` (2.012 against 2.041). It sits 2–3px lower at the bottom of its row. That is native aspect, not a defect, and it is invisible at page scale.
- At 1440 and 1024 it reads as one contact-sheet strip that closes the statement. The layout hole and the oversized tail from pass 2 are gone.
- The strip is short: 177px, about 23% of the hero height. That is shallower than the locked desktop's cropped 330px row, because native aspect is now honoured. It is recorded as a scale observation, not a failure.
- 768 (2 × 2) reads as a composed block.

### 00.4 Page rhythm after the grid change (medium title)

| Viewport | Page | Screens | Hero | Stills |
|---|---|---|---|---|
| 1440×1000 | 3373 | 3.4 | 780 (78%) | 4 |
| 1024×900 | 2862 | 3.2 | 555 (62%) | 4 |
| 768×1024 | 2748 | 2.7 | 416 (41%) | 2 + 2 |
| 600×900 | 3693 | 4.1 | 325 (36%) | 1 × 4 |
| 430×932 | 2975 | 3.2 | 280 (30%) | 1 × 4 |
| 390×844 | 2823 | 3.3 | 253 (30%) | 1 × 4 |
| 375×812 | 2767 | 3.4 | 244 (30%) | 1 × 4 |

- No horizontal overflow at any width. Bands are unchanged.
- The desktop page is 364px shorter than in pass 1.
- The sequence film → title / metadata → stills → loop keeps its alternation of reading and looking.
- The stills block starts at x = 0 (full bleed) and the loop starts at the edge (56 / 32 / 24). This is the same relationship as the locked desktop.
- Below 700 the page is still a column of 2:1 rectangles. This is unchanged from pass 1 and is inherent in the content.

### 00.5 Dynamic project names — Newsreader display preset (Decision 4)

The HERO title (overlay and stacked) and the next-project title now use **Newsreader 400**, uppercase, tracking −0.005em. Marcellus stays on the static page chrome only. There is no language detection, no schema change and no change to the body font.

**Vietnamese rendering, Newsreader preset.** I tested each string with two different fallback font stacks. If a glyph's measured width changes between them, the browser is drawing it from a fallback font. No glyph fell back in any string:

| String | In the loaded Newsreader ranges | Glyphs drawn from a fallback font |
|---|---|---|
| MADE TO MEASURE | ✓ | none |
| TRẦN | ✓ | none |
| NGUYỄN | ✓ | none |
| MÙA THU HÀ NỘI (medium Vietnamese) | ✓ | none |
| NGƯỜI THỢ MAY CUỐI CÙNG Ở PHỐ HÀNG BÔNG (long Vietnamese) | ✓ | none |
| existing very-long stress title | ✓ | none |
| ĐẶNG · PHƯƠNG · HÀ NỘI | ✓ | none |

Newsreader serves 6 faces, including the Vietnamese range. Evidence panel D renders the set in the same face and shows no mixing inside a word. Horizontal overflow: none at any width.

### 00.6 Newsreader Project Detail preset values

Measured DOM advance per 1px (uppercase, −0.005em):

| String | Marcellus 400 | Newsreader 400 |
|---|---|---|
| MADE TO MEASURE | 9.2409 | 10.1766 |
| TOKYO, AFTER RAIN | 9.2617 | 10.1411 |

Newsreader is about 10% wider, so the Marcellus coefficients are **not** inherited. Both are re-derived for **equal optical fill** of the locked candidate's own reference box:

| Role | Reference box | Coefficient | Min | Max |
|---|---|---|---|---|
| Project title | own span (cols 1–8; 1–12 in fallback) | **9.094cqw** | **27px** | **80px** |
| Next-project title | cols 4–10 (1–12 stacked) | **6.913cqw** | **27px** | **53px** |

- Coefficient = Marcellus coefficient × (Marcellus advance / Newsreader advance).
- Max = coefficient × the desktop box. It is load-bearing: engaged at 1440 for both roles.
- Min = Marcellus's 30px at equal fill. It is precautionary for the title (never engaged; smallest size is 29.7px at 375). It is engaged for the next-project title at 430 and below (27px).
- Title sizes as derived: 1440 **79.9** · 768 **42.3** · 430 **34.7** · 375 **29.7**.
- **Wrapped line-height: 0.98 retained.** In the rendered samples (panel D, wrapped at 0.98) the stacked marks and dots-below do not collide. Canvas ink metrics show a theoretical worst case of 1.18em if a dot-below letter sits directly above a stacked-mark letter. Recorded as a preset refinement, not a blocker (00.9).

### 00.7 English-title equivalence

- `MADE TO MEASURE` at 1440 is **79.9px Newsreader** against 88px Marcellus. Both render **813px wide in the 879px box (92.5% fill)**.
- One line in both faces. Block 78px against 86px (10% against 11% of the hero).
- The scrim follows the title. Alpha at the cap line is 0.269, at or above the desktop's 0.244.
- The hierarchy is equivalent: same box, same fill, same position, same line count. The face changes; the composition doesn't.

### 00.8 Long-title rule — verified

The overlay is used only when the title is ≤ 2 rendered lines **and** clears the play affordance **and** clears Back to Works. Otherwise the title stacks below the film, at any width.

| W | EN long (31) | VI long (39) | very long (63) |
|---|---|---|---|
| 1440 | overlay · 2 lines | **stacked (lines > 2)** · 3 lines | stacked (lines > 2, affordance) · 5 lines |
| 768 | overlay · 2 lines | stacked (lines > 2, affordance) · 3 lines | stacked · 5 lines |
| 430 | fallback · 2 lines | fallback · 3 lines | fallback · 5 lines |
| 375 | fallback · 2 lines | fallback · 3 lines | fallback · 5 lines |

No shrink, no truncation, no coefficient change. A long Vietnamese title stacks at desktop, which is the intended bounded behaviour.

### 00.9 Remaining Project Detail questions (non-blocking)

1. **Letterbox pipeline:** engineering-open. Cover hides the bars at wide boxes, but 21–24% of a standard hero is still encoded black.
2. **Wrapped Vietnamese line-height** in the Newsreader preset: 0.98 is clean in the samples; the theoretical worst case is 1.18. Needs a preset-level decision, not a page one.
3. **Desktop stills strip height** (177px at 1440): a scale observation. It follows from four near-identical 2:1 stills at native aspect.
4. **Captured-frame poster** is test evidence. The ADR-0009 administrator poster must be a frame with the same geometry for continuity to hold.
5. Carried from earlier passes: site-wide mobile navigation, the `AUTOPLAY_VISIBLE` threshold, and the fallback threshold (700 or 600).

### 00.10 Maturity

**Recommend: RESPONSIVE VALIDATED — candidate.** The four decisions produced no new blocker:

- cover → cover is continuous
- the phone hero is locked
- the grid removes the 3 + 1 failure without touching the shared algorithm
- dynamic titles render Vietnamese in one face at equivalent hierarchy
- the long-title rule holds at every width

Project Detail remains **NOT Design Approved · NOT production-ready · NOT implementation complete.**

### 00.11 Files (pass 3)

Modified: `Project Detail 1B v2 Responsive.dc.html` and `project-detail-1b-v2-responsive.md`. The locked desktop candidate, governance docs, responsive-system experiments, ADRs, schema and OpenAPI are untouched. Nothing staged, committed or packaged.

**Superseded by pass 3:**

| Pass 3 section | Supersedes |
|---|---|
| 00.1 | pass 2 §0.4 "cover vs contain still blocked" |
| 00.3 | pass 2 §0.3; pass 1 §8 (as page composition — the §8 algorithm results stay as system evidence) |
| 00.5–00.6 | pass 1 §4 values; pass 2 §0.5 decision |
| 00.10 | pass 2 §0.6–0.7 |

---

## 0. Pass 2 — four open questions (2026-09-23)

**Status: still PENDING RESPONSIVE VALIDATION.** Only the four questions
below were reopened. Everything recorded as passing in pass 1 (§7, §9, §11,
§12, playback, fallback concept, JUSTIFIED_ROWS algorithm, sizing method, no
overflow) is untouched. Pass-1 sections below remain the record; where pass 2
supersedes one, it says so here.

### 0.1 LOCKED — long-title behaviour (Project Owner) — applied

Overlay only when **all** hold: ≤ 2 rendered lines · play affordance clear ·
Back to Works clear. Otherwise → stacked title below the film, **at any
width**. No shrink, no truncation, no coefficient change. Implemented in
`L_mode()` as a rule, not a tweak (the `guard` tweak only toggles the two
clearance checks; the line rule is always on). Title matrix now reads e.g.
`1440 verylong → stacked (rule: lines > 2, affordance)`. The very long title
ending below the first screen at 1440 is the **intended bounded behaviour**,
no longer a finding. Not promoted as a global max-line rule.

### 0.2 A — Phone hero presence

Evidence panel A renders the live page's first screen at 430×932, 390×844 and
375×812 for four hero heights, with the poster replaced by a frame of c1
itself (see 0.4) so presence is judged on the real picture.

| 390×844 | hero | box | cover: frame / picture shown | black in hero (cover) | black (contain) | title bottom | statement starts |
|---|---|---|---|---|---|---|---|
| 25% | 211 | 1.85 | 96% / 100% | 21% | 27% | 319 | 591 |
| **30%** | **253** | **1.54** | **87% / 87%** | **24%** | **34%** | **361** | **633** |
| 33% | 279 | 1.40 | 79% / 79% | 24% | 40% | 387 | 659 |
| 36% | 304 | 1.28 | 72% / 72% | 24% | 45% | 412 | 684 |

430 and 375 track within 1%. All four metadata rows and the start of the
statement stay inside the first screen in every option.

- **25%** reads as a strip. Once c1's encoded letterbox is subtracted
  (≈ 24% of any cover frame is black), the picture itself is ~160px tall at
  375 — a thumbnail above a title, not an entrance.
- **30%** is the first height where the film reads as the opening event: the
  picture grows ~20% with a 13–14% side crop, and the title still lands at
  ~43% of the screen.
- **33% / 36%** add presence mainly by cropping (21% / 28% of the picture
  lost) and push the statement lower without adding identity.

**Selected: 30%.** Project Detail-specific derivation, supersedes §14 item 2 for
phones:

```text
W >= 700 : h = min(0.78 H, 0.5417 W, 900)            (unchanged)
W <  700 : h = max(0.5417 W, 0.30 H)
```

At 600×900 this resolves to the width term (325px) — only phones change.
430×932 → 280 · 390×844 → 253 · 375×812 → 244.

**Coupled to fit (0.4):** the gain is real only under `COVER`. Under
`CONTAIN` the extra height is pure bar (black rises 27% → 34%). If the fit
contract later selects contain, this derivation should fall back to the width
term. Recorded, not pre-empted.

### 0.3 B — Desktop 3 + 1 stills in page context

Evidence panel B clones the live page from the end of the statement to the end
of the supporting loop at 1440, 1024 and 768, with the real measured aspects.

| W | Rows | Justified row | Tail | Tail : row height | Empty right of tail |
|---|---|---|---|---|---|
| 1440 | 3 + 1 | 3 × 235px | 609 × 298 | **1.27** | **831px (58%)** |
| 1024 | 3 + 1 | 3 × 167px | 432 × 212 | **1.27** | **592px (58%)** |
| 768 | 2 + 2 | 2 × 189 / 187 | — | — | — |

**Verdict: 768 passes. 1440 and 1024 fail as a page-level visual state.**
Concrete failure, not an algorithm change:

1. **The tail outranks the row it closes.** It is 27% taller than the
   justified row above, so the single still reads as the start of something
   new rather than the end of a contact sheet. Cause: the tail is held at
   `target` (298 / 212) while the full row of three 2:1 stills solves *below*
   target (235 / 167). Legal under the shared rule; wrong in hierarchy here.
2. **It reads as a gap, not a ragged edge.** 58% of the measure is empty void
   beside a full-bleed image, on a dark ground where no edge is drawn. A
   ragged tail reads as deliberate when it is shorter than the rows above it;
   this one is not.
3. **Transition into the loop is incoherent at 1440.** The tail starts at
   x = 0 (full bleed), the loop 150px below starts at the 56px edge and is
   879px wide — two left edges and two widths within one screen.

The shared JUSTIFIED_ROWS algorithm is **not** changed. Recorded as evidence
for the system record: *a tail capped at `target` can exceed the solved height
of the preceding justified row when that row overshoots below target* — here
every time, because all four stills share one aspect. Resolution is a content
or system question for the Project Owner (e.g. a fifth/sixth still packs 3+3;
or a system-level tail rule). No page-specific packing is introduced.

### 0.4 C — Hero fit, controlled

**Material:** no matching poster exists in `media/`. A controlled poster was
made **at run time** by drawing c1 itself to a canvas at 25% of its duration
(2.0s). No file is written and no asset is altered. It has c1's exact geometry
(1280×720) and subject. The `poster` tweak switches the live hero between the
locked unrelated still and this frame.

**Encoded letterbox, measured from pixels** (minimum over samples at 2.0 / 4.0 /
6.0s): **87px top, 87px bottom, 0 sides** → active picture **2.344** inside the
1.778 frame. Not compensated.

| Viewport | Hero | Box | cover → cover | contain → contain | cover → contain (control) |
|---|---|---|---|---|---|
| 1440×1000 | 1440×780 | 1.85 | 100% pic · 21% black · **×1.000** | 27% black · **×1.000** | ×0.963 reframe |
| 1440×600 | 1440×468 | 3.08 | 76% pic · 0% black · **×1.000** | 56% black · **×1.000** | **×0.578** reframe |
| 768×1024 | 768×416 | 1.85 | 100% pic · 21% black · ×1.000 | 27% black · ×1.000 | ×0.963 |
| 390×844 | 390×253 | 1.54 | 87% pic · 24% black · ×1.000 | 34% black · ×1.000 | ×0.867 |

- **Continuity:** with a poster that is the film's own frame, **cover→cover
  and contain→contain are seamless** — same scale, same crop, same subject on
  activation, at all four viewports.
- **cover→contain always reframes**, from 4% to 42%. With a representative
  poster there is no case in which it helps. **Rejected on evidence.**
- **Cover vs contain** is not decided by continuity (both are continuous).
  It is decided by what fills the box — and **c1's encoded bars dominate that
  measure**: under cover, 21–24% of the hero is still black at every standard
  viewport; under contain, 27–56%. Until the letterbox method strips or records
  the active area, any cover/contain comparison is measuring the bars.

**Result: partially resolved.**

- **Resolved (Project Detail evidence):** idle framing must equal playback
  framing — a `CLICK_TO_PLAY` poster takes the film's `fit`. This confirms the
  proposed reading in `page-specifications.md` §3.9 item 2, on this page only.
- **Still blocked by source material:** the choice between `COVER` and
  `CONTAIN`, because the only hero film carries an encoded letterbox.
  Coupled to `design-system.md` §16 item 1. The poster is no longer the blocker.
- Caveat: a canvas-captured frame is prototype evidence, **not** an ADR-0009
  administrator-selected poster.

### 0.5 D — Vietnamese in the Marcellus preset

Test set rendered in panel D: TRẦN · NGUYỄN · ĐẶNG · PHƯƠNG · HÀ NỘI, NFC and
NFD, with Newsreader as control. Diagnosis from the browser's own font API and
canvas, not from screenshots:

- **Loaded Marcellus faces: 2**, both status `loaded` — Google's `latin` and
  `latin-ext` subsets. **No Vietnamese subset is served for Marcellus.**
  Newsreader serves 6 faces including the Vietnamese range (control ✓).
- The Vietnamese block **U+1EA0–1EF1 is outside both Marcellus ranges**
  (latin-ext stops at U+1E9F and resumes at U+1EF2). So are the combining marks
  U+0300–0303, U+0309, U+0323, U+031B.
- Per character (width measured with two different fallback stacks):

| Char | In Marcellus range | Rendered by |
|---|---|---|
| À Â Ê Ô Đ | yes | **Marcellus** |
| Ầ Ặ Ễ Ộ | **no** | **fallback font** |
| Ư Ơ | yes (latin-ext) | **fallback font** — the range claims them, the file lacks the glyph |

- Source strings are NFC; NFC and NFD render pixel-identically, so input
  normalisation is not the cause.

**Cause: (1) actual missing Vietnamese glyph coverage in Marcellus as
served**, which the browser handles by **(3) per-glyph fallback** — so one word
mixes two typefaces (`TRẦN` = Marcellus T, R, N + a fallback Ầ whose stacked
accent sits detached). Font loading is correct (2 ruled out). The canvas
measurements are browser-native, independent of the screenshot tool (4 ruled
out).

**Typography-preset compatibility issue requiring Project Owner decision.**
The Marcellus display preset cannot render Vietnamese project titles. The
metadata (Newsreader) is unaffected. No face was switched and no global
typography change made.

### 0.6 Remaining blockers

1. **Stills 3 + 1 at 1440 / 1024** — page-level visual failure (0.3). Needs a
   content or system-level decision; not solvable on this page without
   inventing packing.
2. **Marcellus Vietnamese coverage** (0.5) — needs an Owner decision on the
   display preset. Affects every Vietnamese title in the overlay and stacked
   states.
3. **Cover vs contain** — blocked by c1's encoded letterbox (0.4); carried to
   the letterbox method. *Not a responsive blocker on its own* — both fits are
   continuous, and the page is coherent under either.

Closed this pass: phone hero presence (30%) · long-title rule (applied) ·
poster→play continuity (same fit required).

### 0.7 Maturity

**Remains PENDING RESPONSIVE VALIDATION.** Two visual blockers (0.6 items 1
and 2) remain, and neither can be closed by a responsive derivation on this
page. If the Owner resolves both, Project Detail can move to **RESPONSIVE
VALIDATED — candidate** with the fit choice carried as a media-architecture
question.

### 0.8 Files (pass 2)

Modified: `Project Detail 1B v2 Responsive.dc.html` · `project-detail-1b-v2-responsive.md`.
Nothing else modified, staged, committed or packaged.

**Superseded pass-1 items:** §3 "guard" → the locked rule (0.1) · §5 very-long
finding → intended behaviour · §5 glyph note → 0.5 · §6 → 0.4 · §13 phone hero
→ 0.2 · §14 item 2 (phones) → 0.2 · §16 items 1, 6, 7, 8, 9 → 0.4 / 0.1 / 0.5 / 0.2 ·
§17 → 0.7.

---

# Pass 1

- **Date:** 2026-09-23
- **Status:** Responsive page validation. **Nothing approved. No design document, spec, ADR, schema or page candidate modified.**
- **Prototype:** `Project Detail 1B v2 Responsive.dc.html` (this directory)
- **Desktop candidate:** `Project Detail 1B v2.dc.html` — **untouched**
- **Consumes:** JUSTIFIED_ROWS v2 (`../responsive-system/justified-rows-narrow-width-v2.md`) · display typography method (`../responsive-system/display-typography-scaling.md`)
- **Authority read:** `design-system.md`, `page-specifications.md` §3, ADR-0006, ADR-0008, ADR-0009, ADR-0010, `MEDIA.md`

All figures below are read from rendered geometry. The prototype recomputes
four tables at run time (title matrix, forced-overlay matrix, page rhythm,
JUSTIFIED_ROWS) and a live audit of the current frame.

## 1. Viewport coverage

1440×1000 · 1024×900 · 768×1024 · 600×900 · 430×932 · 390×844 · 375×812.
JUSTIFIED_ROWS additionally at 699 · 540 · 480 · 450.
Constrained height **1440×600** added because it reveals a real failure (§6).
Stress titles: short `Rain` · medium `Made to Measure` (desktop) · long
`The Last Fitting at Trần & Sons` (31) · very long (63 chars).

## 2. Desktop equivalence at 1440

| Element | Locked | Derivative | |
|---|---|---|---|
| Hero | 1440×780, CLICK_TO_PLAY | 1440×780 | ✓ |
| Title | 88px, cols 1–8, bottom 46 | 88px (max engaged), box 879px | ✓ |
| Scrim | bottom 210 · top 120 | 210 · 120 (derived rule reproduces both) | ✓ |
| Back to works | top-left, hairline | identical (desktop hit area unchanged, 17px) | ✓ |
| Metadata / statement | cols 1–3 / 5–10 | identical | ✓ |
| Supporting loop | cols 1–8 + caption 10–12 | 879×494 + 317px caption | ✓ |
| Credits · coda · footer | — | identical, coda 1440×540, next 58px | ✓ |
| **Stills** | **one row of 4 at 330px** | **3 + ragged 1 (235 / 298px)** | **✗ diverges** |

**The stills divergence is caused by the locked file, not by the rule.** The
locked row uses authored `data-ar` 1.5 / 0.8 / 2.39 / 1.33. The files measure
**2.041 / 2.012 / 2.041 / 2.041** (1000×490, 1000×497, 1800×882, 1000×490).
The locked row's total aspect is 4.36 against a true 8.14 — each still is shown
at roughly half its width under `object-fit: cover`. The locked desktop block 3
therefore **does not preserve native aspect**. Same class of discrepancy
Home's responsive record found in its coda. Not corrected in the locked file.

## 3. HERO + ADR-0010 title overlay

Three presentation states, computed in one place from (mode, activation):

| State | When | Hero carries | Flow carries |
|---|---|---|---|
| **overlay** | ≥ 700 and guard clear | title, bottom scrim, Back to works, top scrim, affordance | — |
| **stacked** (1B mode B) | ≥ 700 and guard trips | Back to works, top scrim, affordance | title, cols 1–8 |
| **derived fallback** | < 700 | affordance only | Back to works, then title, cols 1–12 |

The fallback follows ADR-0010 §6 exactly — the title **and** the navigation line
move beneath the frame. This differs from 1B's desktop mode B, which keeps Back
to works in the frame. At phone the film frame carries nothing but the play
affordance.

**Guard (ADR-0010 §5):** overlay invalid when the title block's top would come
within 16px of the play affordance or the Back-to-works line.

Forced-overlay evidence (overlay at every width, guard off):

| W | medium | long | very long |
|---|---|---|---|
| 1440 | 1 ln · 11% of hero ✓ | 2 ln · 22% ✓ | 5 ln · 55% ✗ affordance |
| 1024 | 1 ln · 11% ✓ | 2 ln · 21% ✓ | 5 ln · 53% ✗ |
| 768 | 1 ln · 11% ✓ | 2 ln · 22% ✓ | 5 ln · 55% ✗ |
| 600 | 1 ln · 11% ✓ | 2 ln · 21% ✓ | 5 ln · 53% ✗ |
| 430 | 2 ln · 25% ✗ | 2 ln · 25% ✗ | 5 ln · 63% ✗ |
| 390 | 2 ln · 28% ✗ | 3 ln · 42% ✗ | 6 ln · 84% ✗ |
| 375 | 2 ln · 29% ✗ | 3 ln · 43% ✗ | 6 ln · 87% ✗ |

- **Overlay is geometrically sound down to 600** for titles of ≤ 2 lines.
  At ≤ 430 even `Rain` collides at 390/375 and the 8-column box (215–251px)
  engages the 30px minimum. **The overlay has no viable phone state** — the
  derived fallback is required, not optional.
- **Fallback threshold 700** is chosen, not forced: 600 would still pass for
  ≤ 2-line titles. 700 aligns with the width where the 8-col box drops below
  ~420px. Owner may prefer 600; the tweak `fallbackAt` shows both.
- **Media activation dismissal verified**: after clicking the hero at 375 and
  1440, overlay, bottom scrim and affordance are gone and **stay gone across a
  full re-layout**; Back to works and its scrim stay (desktop), controls appear,
  audio available.
- **Back to works / title coexistence:** never collided in any tested
  combination (the affordance is always the binding constraint).

## 4. Title typography preset values — PROJECT DETAIL ONLY

| | Value | Basis |
|---|---|---|
| Reference box | the title's own grid span: cols 1–8 (overlay, mode B); cols 1–12 (fallback) | method §8: container on the aligned box |
| Coefficient (Marcellus) | **10.015cqw** | 88 / 878.67 at 1440 — desktop equivalence |
| Minimum | **30px** | precautionary; **never engaged** in any as-derived state (smallest 32.7px at 375) |
| Maximum | **88px** | load-bearing: engaged at 1440 |
| Wrapped line-height | **0.98 retained** | see §5 |

Sizes as derived: 1440 **88** · 1024 **60.2** · 768 **46.5** · 600 **53.7** ·
430 **38.3** · 390 **34.3** · 375 **32.7**. The 768→600 *increase* is the box
changing from 8 to 12 columns at the fallback — the method working, not a defect.

Next-project line (a separate role): **7.569cqw of cols 4–10**, clamp
**30 / 58px**. Its minimum **does engage** at ≤ 768 (30.6 at 768, 30 at
430/390/375). **First page evidence of a display minimum being load-bearing** —
recorded here, not promoted.

## 5. Long title / wrapping

- No shrink-to-fit. Length wraps at constant size in every state.
- Lines, as derived: short/medium **1** everywhere (430 medium 1) · long **2** ·
  very long **5** (6 only under forced overlay at ≤ 390).
- **Very long at 1440:** guard stacks it (mode B); 5 lines × 88px = 431px under
  a 780px hero → **title ends below the first screen**. At 1024 it just fits.
  This is the only ✗ in the as-derived title matrix.
- **Content-dependent mode switch.** The guard means title *length* can change
  presentation (overlay → stacked) at the same width. It never changes *size*,
  so it does not violate the method, but it is a real behaviour the owner should
  accept or replace with a **max-line policy** (evidence: overlay safe ≤ 2 lines
  at all widths ≥ 600, fails at 5). No truncation is proposed.
- **Line-height:** 0.98 holds for uppercase Latin. `lh 1.04` and `1.1` are in
  the tweaks; no evidence yet forces a change — see the glyph issue below.
- **⚠ Vietnamese diacritics:** `TRẦN` renders as a decomposed `Â` + detached
  grave in Marcellus at every size (screenshots at 768 and 1024). Probable cause:
  the loaded Marcellus subset lacks Vietnamese precomposed glyphs. Newsreader
  renders the same string correctly in the metadata. **Face coverage, not
  responsive** — but it affects every Vietnamese project title on this page.
  Not verified at the font-file level; recorded, not solved.

## 6. HERO media fit

Hero height derivation: `min(0.78H, 0.5417W, 900)` — no floor.

| Viewport | Box aspect | c1 aspect | Contain bars | Cover→contain reframe |
|---|---|---|---|---|
| 1440×1000 | 1.846 | 1.778 (1280×720) | 53px L+R | ×1.038 |
| 1024 · 768 · 600 · 430 · 390 · 375 | 1.846–1.847 | 1.778 | 14–40px L+R | ×1.039 |
| **1440×600** | **3.077** | 1.778 | **608px L+R** | **×1.731** |

- At every target viewport the box is **width-limited**, so its aspect is
  constant (≈1.846) and within 4% of the film. **Cover and contain are nearly
  indistinguishable** here; the composition does not stress the choice.
- The poster (`mtm-table`, 2.000) is an **unrelated still**, not a frame of c1,
  so the idle→playback comparison measures an asset mismatch, not a fit
  behaviour.
- **c1's encoded letterbox** is plainly visible on activation (top/bottom bars
  inside 1280×720). No CSS compensation added.
- **Constrained height is the one real failure**: at 1440×600 `contain` leaves
  608px of side bars and cover→contain reframes by 73%. This is the H term of
  the hero formula meeting the unresolved fit contract.

**Result: UNRESOLVED.** Insufficient evidence to select cover-cover,
contain-contain or cover→contain. Carried unchanged to `design-system.md` §16 /
`page-specifications.md` §3.9 item 2.

## 7. Metadata + statement

| W | Layout | dl | Lead / body cpl | Label/value wrap |
|---|---|---|---|---|
| ≥ 1024 | cols 1–3 / 5–10 (locked) | 317 / 213px | 34 / 60 | none |
| 700–1023 | **cols 1–4 / 6–12** | 225px at 768 | 34 / 55 | none |
| < 700 | stacked, dl max 360px, 56px gap | 327–360px | 34 / 45–60 | none |

- Lead drops 26 → **22px below 600**; lead holds 34 cpl everywhere (24ch cap).
- **Semantic order kept** (metadata → statement). It is usable: the ruled
  list is four short rows under the title and the statement follows within the
  same screen at 430–375. `statement-first` is available in the tweaks as a
  *visual* comparison only — shipping it would require a `position` override,
  never CSS `order` (DOM follows `position`). No evidence forces it.

## 8. JUSTIFIED_ROWS — page-level result

Rule consumed **verbatim** (ref 1.6, floor `max(120, 0.10W)`, ceil `1.25W`,
T 3/2/1 at 1024/700, gap 4).

| W | Rows | Heights | Narrowest | Ragged |
|---|---|---|---|---|
| 1440 | 3 / 1 | 235, 298 | 473 | 609 tail |
| 1024 | 3 / 1 | 167, 212 | 335 | 432 tail |
| 768 | 2 / 2 | 189, 187 | 379 | — |
| 699 → 375 | 1/1/1/1 | 342 → 184 | = W | — |

Zero starved cells · source order ✓ · native aspect ✓ (declared vs file ≤ 0.3%)
at all 11 widths.

**Limits of this evidence:**

1. **The real dataset is homogeneous** (all ≈ 2.03). It cannot exercise
   portrait pairing, the ceiling or the **480→450 transition — which does not
   occur here**. Rows are trivially 3+1 / 2+2 / one-up.
2. **Visual concern, not an algorithm failure:** at 1440 and 1024 the ragged
   tail row (298 / 212px) is **taller** than the justified row above it
   (235 / 167px) — the tail capped at `target` while the full row solved lower.
   Legal under the rule. Whether it reads well is the owner's call.
3. Probe set (locked `data-ar`, geometry only): 4-up at 1440/1024 (190 / 134px
   narrowest), 3/1 at 768, 2/1/1 below 700, narrowest 129px at 375 — all above
   floor. The probe shows the rule would also hold for mixed content.

No change to the system algorithm.

## 9. Supporting video + caption

| W | Video | Caption | cpl |
|---|---|---|---|
| 1440 | 879×494 | beside, 317px | 47 |
| 1024 | 601×338 | beside, 213px | 32 |
| 768 | 704×396 | **below**, 36ch | 46 |
| 600 → 375 | 536×302 → 327×184 | below, 36ch | 46 |

- **PD derivation:** caption stacks beneath the video when its own column
  falls below 200px (≈ 28 cpl). This resolves the recorded risk — at 768 the
  side caption would be 165px / ~22 cpl. Stacked caption capped at **36ch** so
  it never runs the full phone measure as body copy.
- Order video → caption preserved (DOM).
- ADR-0008 unchanged: `AUTOPLAY_VISIBLE`, forced muted, `playsinline`, plays at
  ≥ 20% visible within the viewport frame, pauses below, releases source
  off-screen; reduced motion releases to poster. **No audible autoplay** —
  audio exists only on the hero after activation, which also pauses the loop.
- n3 is 1280×720 in a 16:9 cover frame: no crop.

## 10. Scrim

**PD derivation:** bottom scrim = `max(0.269h, 1.588 × title extent)`, capped
at hero height. 1.588 is the ratio that reproduces the desktop's 210px and
holds the desktop's **alpha at the title cap line (0.244)** at every width and
title length. Top scrim = `max(0.154h, 96px)`.

| W | medium | long |
|---|---|---|
| 1440 | 27% of hero | 44% |
| 1024 | 30% | 47% |
| 768 | 30% | 47% |

- The desktop's fixed 210px would be **38% of a 555px hero, 50% of 416px** —
  too heavy for a one-line title and insufficient for a two-line one. Deriving
  from the title keeps contrast constant and weight proportional.
- **Below 700 no scrim exists at all**: nothing sits over the film.
- At 1440×600 the derived scrim is 45% of the hero — heavy, but tied to the
  same constrained-height failure as §6.
- Contrast is *held equal to desktop*, not measured against footage. No global
  rule proposed.

## 11. Credits + final coda + footer

- Credits span: cols 1–3 (≥ 1024) → **1–6** (700–1023) → **1–12** (< 700).
  No name wraps at any width; `dt` fixed 8ch keeps role/name alignment. No card.
- **Coda PD derivation:** `max(0.375W, min(W / 2.004, 0.5H))` — the locked
  2.667 crop at 1440 (75% visible), converging on native aspect at phone
  (375×187, 100% visible). Continuous, no breakpoint.
- Footer stacks < 700: label → next title (12 cols) → All works. Padding scales
  with `--band`. Next title 1 line everywhere at 30–58px.

## 12. Navigation

- **The locked page carries no site header.** Back to works (in-frame) and All
  works (footer) are its only navigation. Kept.
- **Tap targets:** at < 1024 Back to works and All works get a 44px hit area
  via padding; the underline moves from border to `text-decoration` so its
  visible position does not change. **Measured 44px ✓.** At ≥ 1024 the locked
  17px line is unchanged (pointer context; not a phone claim).
- **Stand-in coexistence test** (`siteHeader`, Home's header line — not a
  design): at 375 the wordmark wraps to two lines, nav links are **14px high
  ✗ < 44**, and the page carries two navigation layers before the title.
  Back to works, now in flow beneath the film, does not collide with it.
  **Both layers are not needed simultaneously on this page** by this evidence,
  but the decision belongs to the unresolved site-wide mobile navigation.

## 13. Full-page rhythm (medium title)

| Viewport | Page | Screens | Hero |
|---|---|---|---|
| 1440×1000 | 3737 | 3.7 | 780 (78%) |
| 1024×900 | 3124 | 3.5 | 555 (62%) |
| 768×1024 | 2746 | 2.7 | 416 (41%) |
| 600×900 | 3694 | 4.1 | 325 (36%) |
| 430×932 | 2928 | 3.1 | 233 (25%) |
| 390×844 | 2779 | 3.3 | 211 (25%) |
| 375×812 | 2724 | 3.4 | 203 (25%) |

Horizontal overflow: **none at any width.** Bands 150 / 104 / 80.

- 600 is the longest page: four one-up stills at 294px each.
- **Phone hero prominence:** the film occupies **25% of the first screen**
  (203px at 375). It is the film at its own width — anything taller crops the
  poster or letterboxes under contain. The first screen at 375 reads film →
  Back to works → title → metadata. Film-first order survives; film-first
  *scale* does not.
- **Feed risk below 700:** from the stills to the coda the page is a column of
  six near-2:1 rectangles (4 stills, the loop, the coda) separated by the
  caption and credits. The bands keep it paced, but it is closer to a vertical
  feed than the desktop. Driven by the homogeneous dataset (§8.1).

## 14. Project-Detail-specific derivations (B)

1. Frame tiers: edge 56/32/24 · gutter 20/14/10 · band 150/104/80 at ≥1024 / ≥600 / <600.
2. Hero height `min(0.78H, 0.5417W, 900)`, no floor.
3. Affordance `min(78, max(56, 0.3h))`; whole frame is the hit area.
4. Overlay bottom offset 46 (≥ 1024) / 32.
5. Title: reference box = own span; 10.015cqw; clamp 30 / 88; lh 0.98.
6. Next-project: 7.569cqw of cols 4–10; clamp 30 / 58.
7. Derived fallback < 700: title + Back to works in flow, 12 columns; no scrim.
8. Overlay safety guard → mode B (affordance / back-line clearance 16px).
9. Scrim: bottom `max(0.269h, 1.588 × extent)`; top `max(0.154h, 96)`.
10. Metadata 3|6 → 4|7 → stacked (dl max 360px); lead 22px < 600.
11. Caption stacks under the video when its column < 200px; stacked cap 36ch.
12. Credits span 3 → 6 → 12 columns.
13. Coda `max(0.375W, min(W/2.004, 0.5H))`.
14. Footer stacks < 700; padding scales with band.
15. 44px hit areas below 1024 for Back to works / All works.

**None promoted.**

## 15. Shared system candidates consumed (A)

1. **JUSTIFIED_ROWS v2** — verbatim; no constant changed.
2. **Display typography method** — `clamp(preset min, coef × 100cqw, composition max)`,
   container on the aligned box, wrap not shrink, no JS measurement.
3. ADR-0008 playback semantics and ADR-0010 dismissal-on-activation — consumed
   unchanged.

## 16. Unresolved

1. **Hero fit contract** — insufficient evidence here (§6).
2. **Constrained-height hero** — 1440×600 box 3.08: 608px contain bars / 73% reframe.
3. **Letterbox method** — c1's encoded bars visible; untreated.
4. **Desktop stills discrepancy** — locked `data-ar` ≠ files; the locked row crops.
5. **Ragged tail taller than its row** at 1440 / 1024 — owner visual judgement.
6. **Content-dependent overlay → stacked switch** vs a max-line policy.
7. **Very long title below the fold at 1440** in mode B.
8. **Marcellus Vietnamese glyph coverage** (`TRẦN` decomposes).
9. **Phone hero at 25% of the first screen** — owner visual judgement.
10. **Fallback threshold** 700 vs 600.
11. **Site-wide mobile navigation** — not designed; stand-in shows 14px links.
12. **Real portrait / mixed stills** never exercised on this page; 480→450 not reached.
13. `AUTOPLAY_VISIBLE` threshold (design-system §16 item 7) — prototype uses 20%.

## 17. Maturity recommendation

**Remain PENDING RESPONSIVE VALIDATION.** Not forced.

The responsive *geometry* passes: no overflow, no starved cell, native aspect
everywhere, ADR-0010 fallback derived and dismissal verified, caption and
credits resolved, tap targets met, no audible autoplay. Four items are visual
blockers this pass cannot close on its own:

- **§16.4** — desktop equivalence cannot hold for block 3 without the locked
  file cropping; the owner must accept the native-aspect 3+1 at 1440 (with the
  taller tail, §16.5) as the desktop's new state.
- **§16.8** — the page's own sample title breaks in the display face.
- **§16.9** — whether a 25%-height film satisfies "opens directly into the film"
  at phone is an eye judgement.
- **§16.6 / 16.7** — the very-long-title behaviour needs an owner rule.

If the owner accepts §16.4/16.5/16.9 as-is and rules on §16.6, Project Detail
can move to **RESPONSIVE VALIDATED — candidate**, with §16.8 carried as a
typography-preset issue. Even then: **not Design Approved, not production-ready,
not implementation complete.**

## 18. Files

Created:

- `docs/design/prototypes/project-detail/Project Detail 1B v2 Responsive.dc.html`
- `docs/design/prototypes/project-detail/project-detail-1b-v2-responsive.md`

Modified: **none.** Not staged, not committed, not packaged.
