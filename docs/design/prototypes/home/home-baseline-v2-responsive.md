## 0. Locked responsive findings

Accepted by the Project Owner on 2026-09-22.

**Status: RESPONSIVE VALIDATED — candidate.**
**Not** design approved · **not** production-ready · **not** implementation
complete.

**HERO**

```text
height = max(240px, min(0.72 × viewport-height, 0.62 × viewport-width, 900px))
```

**Display typography**

- Reference box = the Home display alignment composition.
- Marcellus Home preset retains coefficient **0.1330**.
- Bounded composition-relative method; responsive candidate currently
  represented as **`clamp(40px, 13.30cqw, 250px)`**.
- The minimum engages at **390px and below** — **HOME-SPECIFIC supporting
  evidence**. **40px is not promoted globally.**
- Spectral and Archivo remain **stress tests only**. The Home face remains
  **Marcellus**.

**VIDEO_GRID**

- **3 columns at ≥1024px, 2 columns below, no Home one-column mode.**
- Source order preserved · nothing hidden · nothing reordered.
- Ninth item is a **full-span closing frame**.
- The previous **640px one-column behaviour is rejected**.
- The **480–540 weakness is resolved**.
- **186 × 104px cells at 375 are accepted for this Home candidate** — the wall
  is a visual index, two columns stay readable at that scale, and every tested
  one-column breakpoint costs a 1.5–2.0 screen page-height cliff. Coherent page
  rhythm outweighs larger cells. **HOME-SPECIFIC; not a global VIDEO_GRID
  rule.**

**About**

- The locked fixed **1340 × 208** heading geometry was a prototype /
  direct-edit artifact.
- This derivative uses **composition-relative width and content-driven
  height**.
- **`portrait.jpg`** replaces the stale `about-portrait.png` reference.
- Portrait **native aspect (~0.645) preserved**.

**JUSTIFIED_ROWS**

- Consumes the existing shared system candidate.
- Real / native media aspect ratios · source order preserved · no starved
  cells · **no Home-level failure at the 480 → 450 system transition**.

**Coda**

- The stale authored `data-ar` values in the historical desktop artifact
  **remain historical evidence**.
- Responsive validation uses **actual / native** media aspect ratios.

**Open and non-blocking**

- Site-wide navigation **touch targets** (44px) — not Home's to settle.

### Historical artifact policy

`Home Baseline v2.dc.html` and `home-baseline-v2.md` are **not modified**, and
remain locked historical evidence **even where they contain** the fixed
`ABOUT ME` dimensions, the stale `about-portrait.png` reference and the stale
coda `data-ar` values. History is not rewritten to match the derivative.

---

# Home — responsive validation of the locked desktop candidate

- **Date:** 2026-09-22
- **Status:** Responsive validation evidence. **Not design approved, not production-ready.**
- **Prototype:** `Home Baseline v2 Responsive.dc.html`
- **Locked desktop candidate, untouched:** `Home Baseline v2.dc.html`, `home-baseline-v2.md`
- **System candidates consumed:** JUSTIFIED_ROWS v2 · Display typography scaling

No governance document, page candidate or responsive-system experiment was
modified. All figures are measured from rendered geometry inside a switchable
viewport frame.

## 1. Viewport coverage

1440×1000 · 1024×900 · 768×1024 · 600×900 · 540×900 · 480×900 · 430×932 ·
430×600 · 390×844 · 375×812. Widths 699/450 also available in the switch.

## 2. Desktop equivalence at 1440

Preserved: section sequence, hero relationship, wordmark hierarchy (**177px vs
the locked 175px** — the same `13.3cqw` against the same box), 3-column
VIDEO_GRID at 472px cells, About text/portrait asymmetry, footer spacing.

**One deliberate difference — the coda.** The locked desktop renders four
stills in **one flex row at a fixed height**, which makes cell widths
proportional to aspect *at a shared height* — the same thing, except the locked
version then lets `object-fit: cover` absorb the difference. Under the system
candidate the coda becomes **two rows (3 + 1)** at 1440.

This is not the algorithm misbehaving. It is the algorithm refusing to crop:
the locked coda also carries **authored `data-ar` values (2.39 / 1.5 / 0.8 /
1.78) that do not match the real files** (1.776 / 1.776 / 2.012 / 2.041), so its
cells were never at native aspect. Validating a native-aspect rule against
invented ratios would prove nothing, so the real ones are used here.

**Recorded, not decided:** accepting the system candidate on Home changes the
desktop coda from one row to two.

## 3. HERO findings

Derived height: `max(240px, min(0.72 × H, 0.62 × W, 900px))`.

| Viewport | Hero | % of viewport height |
|---|---|---|
| 1440×1000 | 1440×720 | 72% |
| 768×1024 | 768×476 | 46% |
| 600×900 | 600×372 | 41% |
| 430×932 | 430×267 | 29% |
| 430×600 | 430×267 | 45% |
| 375×812 | 375×240 | 30% |

The width term is what keeps it honest: without it a tall phone would give the
hero 670px of a 932px screen and the page would open on nothing but a crop. At
29–30% on phones the hero still reads as an opening frame rather than a banner,
and the identity block below is visible on first screen.

Playback model unchanged — ambient, muted, inline, lifecycle-aware, released
offscreen, poster under reduced motion. **No letterbox work was required**: no
Home composition produced a failure that needs the unresolved active-area rule.

## 4. Display typography — shared method consumed

Reference box: **the 12-column span the display actually aligns to** (Home's
existing container). Utilisation is **51% at every tested width** — 1328px box
at 1440 through 312px at 375 — so the relationship to the layout is invariant,
which is the property the method exists for.

**The old clipping risk disappears once the box and the coefficient are scoped
per face:**

| Face | 1440 | 375 |
|---|---|---|
| Marcellus | 177px · 51% | 43px · 51% |
| Spectral | 164px · 48% | 40px · 47% |
| Archivo | 168px · 50% | 41px · 48% |

No overflow, no clipping, one line, at either extreme. The ≤3pp spread is the
residue of glyph metrics, not a defect.

The **minimum engages at 390 and below** (43 → 40px floor). **Recorded as
HOME-SPECIFIC SUPPORTING EVIDENCE only** — it is one page's data point for a
bound the typography experiment recorded as untested, and it must not be
promoted into a universal display-typography value.

## 5. Home typography preset — candidate values

```text
Home display preset
  reference box   the 12-column span (existing container)
  coefficient     Marcellus 0.1330   (= the locked 13.3cqw, preserved)
                  Spectral  0.1235   } re-derived from each face's own
                  Archivo   0.1262   } measured advance, not reused
  minimum         40px
  maximum         250px
  wrapping        allowed; never needed for "Portfolio" at any tested width
```

Coefficients are **preset-and-face scoped**, never tuned by string length.

## 6. VIDEO_GRID findings — focused hardening of the 480–640 band

Three bounded strategies were compared on the real nine-item sequence, at a
fixed 900px viewport height so page lengths are comparable.

**A — locked control (3/2/1 at 1024/640, no tail treatment)**

| Width | Cols | Cell | Wall | Page | Screens | Orphan |
|---|---|---|---|---|---|---|
| 640 | 2 | 318px | 910px | 4467px | 5.0 | **✗ yes** |
| 600 | 1 | 600px | 3070px | 6513px | **7.2** | — |
| 560 | 1 | 560px | 2867px | 6151px | 6.8 | — |
| 520 | 1 | 520px | 2665px | 5794px | 6.4 | — |
| 480 | 1 | 480px | 2462px | 5465px | 6.1 | — |
| 430 | 1 | 430px | 2209px | 4973px | 5.5 | — |
| 375 | 1 | 375px | 1930px | 4497px | 5.0 | — |

**A fails on its own terms.** A 40px narrowing from 640 to 600 lengthens the
page by **2,046px — 2.3 screens** — with no visual reason a visitor could
name. And the page at 600 (7.2 screens) is *longer than the same page at 375*
(5.0). The orphan at 640 is real and untreated.

**B — two columns throughout, ninth item spans the row**

| Width | Cell | Wall | Page | Screens | Orphan |
|---|---|---|---|---|---|
| 640 | 318px | 998px | 4555px | 5.1 | ✓ none |
| 600 | 298px | 937px | 4380px | 4.9 | ✓ |
| 560 | 278px | 875px | 4159px | 4.6 | ✓ |
| 520 | 258px | 813px | 3943px | 4.4 | ✓ |
| 480 | 238px | 752px | 3754px | 4.2 | ✓ |
| 460 | 228px | 721px | 3664px | 4.1 | ✓ |
| 430 | 213px | 674px | 3438px | 3.8 | ✓ |
| 390 | 193px | 613px | 3232px | 3.6 | ✓ |
| 375 | 186px | 590px | 3156px | 3.5 | ✓ |

**Monotonic, no cliff, no orphan at any width.** Page length falls smoothly
from 5.1 to 3.5 screens as the viewport narrows — which is what a reader
expects.

**C — two columns until an evidence-based one-column breakpoint**

Every candidate threshold was measured for the cliff it creates at a 20px
narrowing:

| One-column at | Cell at threshold | Page above | Page below | Cliff |
|---|---|---|---|---|
| 560 | 278px | 4159px | 5975px | **+1,816px (2.0 screens)** |
| 520 | 258px | 3943px | 5617px | +1,674px (1.9) |
| 480 | 238px | 3754px | 5304px | +1,550px (1.7) |
| 460 | 228px | 3664px | 5155px | +1,491px (1.7) |
| 430 | 213px | 3438px | 4792px | +1,354px (1.5) |

**There is no good breakpoint for C.** The cliff is not a property of *where*
the switch happens but of the switch itself: taking nine 16:9 cells from two
columns to one roughly doubles the wall, so every candidate costs 1.5–2.0
screens for a 20px width change. Choosing among them is choosing which cliff,
not whether to have one.

**Selected: B.**

The deciding evidence is the absence of a cliff, not the cell size. At 375 a
cell is 186 × 104px — small, but this wall is an **index of what is moving
this year**, not the viewing surface; the project pages are where a film is
watched. Two-up thumbnails at half the screen width are legible as an index,
and the alternative costs a 1.5-screen discontinuity that no visitor could
attribute to anything they did.

**Ninth item.** It spans the row at 2.4:1 — at 375 that is 375 × 156px, **26%
of the wall's height**, roughly 1.5× a normal cell. It reads as a closing frame
rather than an accident: wider than everything above it, shallower than a full
cell pair, and in source position. Nothing is hidden, nothing is reordered, and
the counterfactual (`tailSpan: false`) still reports `✗ orphan tail`.

**The 480–540 weakness is resolved**: 6.1–6.4 screens under A becomes 4.2–4.4
under B, and the band is no longer distinguishable from its neighbours.

## 7. About section

Stacks below 700. The portrait keeps a **width mode (58%), never a crop** —
measured aspect 0.645 against native 0.645 at every width, `✓ uncropped`
throughout. Text leads, portrait follows, so identity → evidence order survives
stacking; the desktop `align-items: end` asymmetry becomes a top-aligned stack,
which is the smallest transformation that keeps the editorial character.

## 8. JUSTIFIED_ROWS on the real page

Shared candidate applied verbatim (ref 1.6, T, floor, ceil).

| Width | Rows | Heights | Narrowest | Order | Aspect |
|---|---|---|---|---|---|
| 1440 | 3/1 | 257, 298 | 457px (floor 144) | ✓ | ✓ |
| 1024 | 3/1 | 183, 212 | 324px (floor 120) | ✓ | ✓ |
| 768 | 2/2 | 215, 189 | 379px | ✓ | ✓ |
| 600 | 1/1/1/1 | 338,338,298,294 | 600px | ✓ | ✓ |
| 430 | 1/1/1/1 | 242,242,214,211 | 430px | ✓ | ✓ |
| 375 | 1/1/1/1 | 211,211,186,184 | 375px | ✓ | ✓ |

**No starved cells, source order intact, native aspect intact at every width.**
The **480 → 450 transition produces no Home-level aesthetic failure**: with only
four items the coda is already one-up by 600, so the step happens above Home's
sensitive range.

**No shared-system candidate failed in real Home use.**

## 9. Footer

Separated from the coda by the same band as every other seam. Below 700 the
footer nav drops under the address block and left-aligns rather than
compressing against it. The email scales `clamp(20px, 2.6vw, 40px)`. The page
still ends on a deliberate line rather than trailing off.

## 10. Mobile navigation

**The existing navigation survives at 430, 390 and 375 without a structural
change**, and the three nav links sit on one line with no collision. The
**wordmark wraps to two lines** at all three widths (20px tall at 10px type) —
it collides with nothing, but it is not the single line desktop shows. Only
density is derived (gap 30 → 22 → 16px, links 15 → 14px, wordmark 11 → 10px,
column split 1/6 + 6/13).

Tap targets are the honest weakness: at 14px with a 16px gap the links are
legible but below a 44px touch target. **Recorded, not solved** — it is a
site-wide question and §8 of the brief forbids promoting a Home treatment to a
global rule.

## 11. Constrained height (430 × 600)

**No new failure.** Hero at 45% of viewport, identity block reachable on the
second screen, no trapped controls (Home has no form), no hidden navigation.
The page is 8.2 screens rather than 5.3 — a consequence of the short viewport,
not of the composition. Per the brief, nothing was invented here.

## 12. Reduced motion and accessibility

- Reduced motion: **0 videos playing, 0 sources loaded**, every surface resolved
  to its poster. Deterministic.
- **No horizontal overflow at any tested viewport** (the earlier 15px was the
  instrument's own scrollbar — see §14).
- Source order equals visual order at every width; stacking never reorders.
- Reading measures: **38–51 characters at every tested viewport** (327px at
  375 up to 437px at desktop). See §14 items 9–10 — a breakpoint alone did not
  deliver this.
- Body text never below 16px; display type never below 40px.
- Links keep the standard accent hover and remain keyboard-reachable.

## 13. Full-page rhythm

The three-part sequence holds. VIDEO_GRID → About → JUSTIFIED_ROWS stays
differentiated because **the About block interrupts with text at every width** —
it is the only thing preventing the wall and the coda from reading as one
undifferentiated feed, which makes it structural rather than decorative.

Total page: 3.2–3.8 screens at desktop and tablet, 4.8–5.3 on phones, **6.0–6.6
in the 480–540 band** — the one place the rhythm sags (§6b).

## 14. Home-specific derivations (A)

1. Hero height `max(240, min(0.72H, 0.62W, 900))`.
2. Wall columns **3 at ≥1024, 2 below** — strategy B. The locked 640
   one-column threshold is not used; no one-column mode is used on Home at all
   (§6).
3. Wall tail cell spans the row at two columns, 2.4:1.
4. About stacks below 700; portrait width mode 58%.
5. Navigation density only — no structural change.
6. Footer nav stacks below 700; email `clamp(20px, 2.6vw, 40px)`.
7. Edge/gutter/band steps 56/20/140 → 32/14/96 → 24/10/72.
8. Home display preset values (§5).
9. **Reading columns stack by measure, not only by breakpoint.** Any `[data-col]`
   element stacks below 700 (as the locked file does), and the identity
   paragraph pair stacks whenever *either* column would measure under 300px —
   which is what 768 and 1024 do. The pair stacks together or not at all.
10. Footer email sized against **its own column** (10.5% of it), not the
    viewport.

## 15. Shared system candidates consumed (B)

1. **JUSTIFIED_ROWS v2**, verbatim, for the coda.
2. **Bounded composition-relative display typography**, with the reference box
   set to the 12-column span and per-face coefficients.

## 16. Shared candidates that failed in real use

**None.** Both behaved as their system evidence predicted. The only consequence
worth flagging is §2's coda row-structure change, which is the rule working
correctly against data that was previously not aspect-honest.

## 17. Remaining questions

**The three Project Owner rulings are applied and are no longer blockers:**

1. **Fixed-pixel `ABOUT ME` heading** — confirmed a direct-edit artifact, not
   design intent. The locked file is untouched; this derivative never carried
   it, and its display type is composition-relative with content-driven height.
2. **`about-portrait.png`** — this derivative uses the canonical
   `media/w/portrait.jpg`, native aspect preserved (0.645 rendered vs 0.645
   native at every width).
3. **Stale coda `data-ar` values** — this derivative uses the real file
   aspects (1.776 / 1.776 / 2.012 / 2.041). Native-aspect correctness overrides
   pixel-equivalence with the stale desktop geometry, as ruled.

**Open, and none of them blocking:**

- **Touch target sizing** for the nav — 14px links with 16px gaps are legible
  but under a 44px target. Site-wide, not Home's to settle.
- **Cell size at the narrow end.** Two-up cells reach 186 × 104px at 375. The
  evidence says this beats a 1.5-screen cliff, but it is a judgement the owner
  may want to make by eye.
- **Coda row structure at desktop** — 3 + 1 rather than the stale one-row
  geometry, per ruling 3.

## 18. Maturity recommendation

**RESPONSIVE VALIDATED — candidate.**

The conditional is discharged: all three blocking discrepancies were ruled on
by the Project Owner and are applied in this derivative, and the one remaining
visual question — the 480–640 VIDEO_GRID band — is resolved by a Home-specific
derivation backed by measurement rather than convention.

At every tested viewport from 1440 down to 375: desktop equivalence holds, both
system candidates work unchanged, there is no horizontal overflow, no starved
cell, no reordering, no cropping, reading measures stay at 38–51 characters,
reduced motion is deterministic, and page length now falls monotonically as the
viewport narrows.

Home remains **not** design approved, **not** production-ready, **not**
implementation complete.

## 20. Defects found and fixed during validation

Each was a real regression **in this artifact**, not in the locked file:

1. **Reading columns never stacked.** The locked candidate stacks *every*
   `[data-col]` element at mobile; this artifact reimplemented stacking per
   section, so Block 2's paragraphs kept their desktop spans and rendered at
   **130px and 102px — 16 and 12 characters — at 375**. Fixed with a general
   pass. The lesson generalises: reimplementing a rule case by case loses the
   cases nobody enumerated.
2. **A breakpoint alone was not sufficient.** With stacking restored at 700,
   the paragraphs still measured 285/225px at 768 and 368/288px at 1024.
   Reading columns now stack on **measure**.
3. **Stacking the pair independently looked like a mistake.** At 1024 only the
   short column stacked. The pair now stacks as a unit.
4. **The footer email overflowed its own column at 375** (194px inside 187px)
   because it was sized from the viewport; it is now sized from the column.
5. **The instrument reported 15px of horizontal overflow at every width** — its
   own scrollbar, plus the coda being built from the nominal viewport number
   instead of the real content box. Both fixed; overflow is genuinely zero.
6. **The stacking pass was deleted by a later patch and the failure was
   silent.** A source splice between `wall()` and `about()` removed
   `stackCols()`; `apply()` kept calling it, and the per-pass `try/catch`
   swallowed the throw into a logged `{}` while every other pass carried on —
   so the page still looked plausible and the 130px/102px reading columns came
   back undetected. Restored, and the audit now reports **`passes ✓ all layout
   passes ran`** or names the failed pass, so a dead pass can never look
   plausible again. Re-verified after the fix: 38/38 · 45/45 · 51/49 · 51/49
   characters at 375 / 430 / 768 / 1024, desktop 1/6 + 9/13 unchanged, console
   clean.

## 19. Files created / modified

**Created (2):**
- `docs/design/prototypes/home/Home Baseline v2 Responsive.dc.html`
- `docs/design/prototypes/home/home-baseline-v2-responsive.md`

**Modified:** none. `Home Baseline v2.dc.html`, `home-baseline-v2.md`,
governance documents, ADRs, schema, OpenAPI and the responsive-system
experiments were all left untouched. Nothing staged, nothing committed.
