# About Me — 3B v2 responsive validation

- **Date:** 2026-09-23
- **Status:** Responsive page validation. **Nothing approved.** No design document, spec, ADR, schema or page candidate was modified.
- **Prototype:** `About Me 3B v2 Responsive.dc.html` (this directory)
- **Desktop candidate:** `About Me 3B v2.dc.html`, **untouched**
- **Consumes:** the display-typography method (for the email line only)

All figures come from rendered geometry. The prototype recomputes four tables at run time (page matrix, experience + captions, order/portrait comparison, header) and shows a live audit.

## 1. Viewport coverage

Tested viewports: 1440×1000, 1024×900, 768×1024, 699×900, 600×900, 540×900, 480×900, 430×932, 390×844, 375×812.

I added no constrained-height case, because none revealed a failure.

The experience section was also stressed with long Vietnamese and English entries.

## 2. Desktop equivalence at 1440

| | Locked | Derivative | |
|---|---|---|---|
| Portrait | 429×666, 0.6445, hangs +58px below the datum | 429×666, 0.6445, +58 | ✓ |
| Opening datum, partial rule (46%), left reading spine | — | identical | ✓ |
| Statement / biography / background | 24 / 17 / 17px, 30ch / 54ch | identical: 39 cpl / 73 cpl | ✓ |
| Evidence image under the biography (70.6% of the column) | — | identical | ✓ |
| Process pair, missing-slot pair, experience, contact | — | identical placement | ✓ |
| Page height | 2482 | 2482 | ✓ |

**Two changes are semantic only; neither is visible.**

1. **Opening DOM order.** The derivative authors the opening in the narrow reading order: statement → portrait → biography → evidence. The desktop grid places the same items exactly as the locked file does: statement, biography and evidence in cols 1–7 on rows 2–4, and the portrait in cols 9–12 spanning those rows. Rendered geometry is identical.
2. **Heading and caption markup.** The "About me" marker is now an `h1`, because the locked page has no `h1` and its only heading is the `h2` "Selected experience". The portrait caption is now a `figcaption` inside a `figure`. Styling is unchanged.

## 3. Final stacking order

**Below 700px:** header → datum → *About me* (h1) → opening statement → **portrait** → biography → background → partial rule → evidence (desk-01, its caption, its answering line) → process line → atelier + caption → missing slot + caption → slot line → *Selected experience* (h2) + list → availability line → email.

**DOM order = reading order = visual order at every width.** The audit checks this (`ord ✓`) at all 10 widths.

Comparison at phone widths (portrait top y, statement visible, biography lines in the first screen):

| Order | 600 | 430 | 390 | 375 |
|---|---|---|---|---|
| **statement → portrait (selected)** | 282 · ✓ · 5/7 | 277 · ✓ · 6/9 | 277 · ✓ · 5/10 | 277 · ✓ · 3/10 |
| locked DOM (portrait after evidence) | **1058** · ✓ · 7/7 | **1017** · ✓ · 9/9 | 1025 · ✓ · 10/10 | 1047 · ✓ · 10/10 |
| portrait first | 117 · ✓ · 5/7 | 124 · ✓ · 5/9 | 124 · ✓ · 4/10 | 124 · ✓ · 3/10 |

The locked DOM order **delays identity to the second screen** (0% of the portrait in the first screen). This is the risk recorded in `about-me-3b-v2.md` §8.1.

"Portrait first" makes the page open on an image, which contradicts the locked decision that writing leads.

**The selected order keeps writing first and brings identity into the first screen, at 100% of the portrait on every phone viewport.** It is About-specific.

## 4. Portrait

The portrait renders at **native aspect 0.6445 at every width** with no `object-fit` (the audit reports `✓ uncropped` 10/10).

| W | Tier | Portrait | Share of screen height | Placement |
|---|---|---|---|---|
| 1440 | desk | 429×666 | 67% | cols 9–12 (locked) |
| 1024 | desk | 291×451 | 50% | cols 9–12 |
| 768 | tab | 225×350 | 34% | cols 9–12. Same 30% of width as desktop, so not too small in proportion |
| 699 / 600 / 540 / 480 | phone | 267×414 | 46% | hangs from the right edge |
| 430 | phone | 276×428 | 46% | right |
| 390 | phone | 250×388 | 46% | right |
| 375 | phone | 241×374 | 46% | right |

**Phone derivation (About-specific):** portrait width = `min(content, 0.46 × H × 0.6445)`, which caps its height at 46% of the viewport. It hangs from the right edge, so the desktop's "images answer from the opposite side" survives.

Alternatives tested, at 375:

- **Full width:** 327×507, 62% of the screen, with 0 biography lines in the first screen. It dominates the page.
- **Home's 58% width mode:** 190×295 (36%). It works at 375, but at 600 it gives 320×496 (55%), because width-relative sizing grows with the viewport.

The height cap is the only rule that holds a constant share of the screen across the phone band.

## 5. Typography

The page has no dynamic display title. Its display roles are all **static Latin**:

- the "About me" marker (12px tracked caps)
- the opening statement (24px Newsreader, a body face)
- the email line (Marcellus)

| Role | Treatment | Result |
|---|---|---|
| Opening statement | 24px → **21px below 600**, 30ch | 38–41 cpl everywhere, no clipping |
| Email (Marcellus, static) | **shared method:** `clamp(20px, 6.06cqw, 26px)` against its own box. At 1440 the box is cols 9–12 (26 / 429); below 1024 it is full width | 26px at 1440, 768 and 480–699. **Min engaged** at 1024 (291px box) and 375. 23.1px at 430, 20.7 at 390. Fits in every state (59% of the box at 1440) |
| Section label, captions | unchanged (17px italic, 13px italic) | — |

The minimum bound is load-bearing for the email at 1024 and 375. No Project Detail or Art Works values are reused. **The coefficient is About-specific.**

## 6. Biography measure

| W | Biography width | Statement / biography / answer / process / slot line (cpl) |
|---|---|---|
| 1440, 1024 | 513px | 39 / **73** / 59 / 58 / 59 |
| 768 | 405 | 39 / 58 / 42 / 58 / 59 |
| 699–540 | 492–513 | 39–41 / 71–73 / 59 / 58 / 59 |
| 480 | 432 | 41 / 62 / 59 / 58 / 59 |
| 430 | 382 | 41 / 55 / 56 / 56 / 56 |
| 390 | 342 | 40 / 49 / 51 / 50 / 50 |
| 375 | 327 | 38 / 47 / 48 / 48 / 48 |

The biography's 73 cpl is the locked desktop value (54ch cap) and holds as a maximum. There is no awkwardly narrow column: the tablet's 405px text column (58 cpl) is the narrowest non-phone measure.

**At 1024 the process pair stacks.** Its text column would be 213px, which is below the 300px rule, so the line becomes full-measure (58 cpl) above the image.

## 7. Editorial asymmetry

All four devices are About-specific:

| Device | Desktop | Tablet (700–1023) | Phone (< 700) |
|---|---|---|---|
| Shared datum rule | ✓ spans cols 1–12 | ✓ | ✓ full-width line above the column. It still opens the section, and reads as a datum because the h1 hangs directly from it |
| Portrait +58 offset from the datum | ✓ | ✓ | **→ right-hung portrait.** The vertical offset becomes a horizontal one |
| 160px tail (text runs past the portrait) | ✓ | ✓ | removed (single column) |
| Partial closing rule, 46% | ✓ | ✓ | ✓ 46% of the column (150–299px), still reads as partial |
| Text left spine / images opposite | ✓ | ✓ process image **offset to cols 4–12**, slot image to cols 1–9 | text left. Portrait right, other images full measure |
| Process / slot pairs side by side | ✓ | stacked when the text column is under 300px (at 768 both stack; at 1024 only the process pair) | stacked |

**Lateral void beside the right-hung portrait:** 384px at 699, 285 at 600, 225 at 540, 165 at 480, 106 at 430, 92 at 390, 86 at 375.

**Derivation (About-specific):** when the void holds the caption plus 16px, the caption "Hanoi, 2025" moves into it, bottom-aligned beside the portrait as a margin note. This applies from 699 down to 390. At 375 the void is 86px, too small for the caption, so it falls back below the portrait.

This turns the void into a composed margin rather than accidental whitespace. The page never centres.

## 8. Experience section

| | 1440 | 1024–480 | 430–375 |
|---|---|---|---|
| Layout | label cols 1–2, list cols 4–10 (locked) | label above, list cols 1–10 (tablet) or full measure | label above, full measure, gap 26 → 16 |
| Lines per row (sample) | 1/1/1/1 | 1/1/1/1 | **2**/1/1/1 (the "Trần & Sons" row wraps) |
| Lines per row (long stress) | 2/1/2/1 | 2/2/2/1 | 2/2/2/1 at 430; **3**/2/2/1 at 390 and 375 |
| Year column aligned | ✓ | ✓ | ✓ at every width, including long entries |

**Rows stay aligned (year beside role) at every width.** The year does not move above the role; the fixed 5ch year column plus wrapping role text scans cleanly even at three lines. There are no cards, no timeline and no overflow.

## 9. BTS / secondary imagery

| Image | Desktop | Tablet | Phone |
|---|---|---|---|
| desk-01 (evidence, 1.776) | 70.6% of the text column | 70.6% (286px at 768) | **full measure** |
| mtm-atelier (process, 2.04) | cols 6–12 | offset cols 4–12 | full measure |
| On-set slot (3:2 placeholder) | cols 1–4 | cols 1–9 | full measure |

- All images keep native aspect with `height:auto`. Nothing is cropped.
- The largest image on phone is the portrait (46% of the screen). The other images reach 17–24%.
- Pairings survive as **line → image** (process) and **image → line** (slot, and desk-01 with its answer inside the same figure). This alternation is the DOM order at every width.

## 10. Captions

- Every caption is a `figcaption` inside its image's `figure`.
- Gap to its image: +11 or +12px everywhere (portrait: beside it, as a 16px margin note, from 699 to 390).
- Caption width equals its image width. Line length stays at 37–65 cpl for the portrait and evidence, and captions stay single-line.
- 13px italic muted text is never confused with the 17px roman biography. Contrast is 4.75:1 (the locked `--muted`).

## 11. Mobile density

| | 600 | 430 | 375 |
|---|---|---|---|
| Page | 2926 (3.3 screens) | 2744 (2.9) | 2706 (3.3) |
| First screen | statement, portrait 100%, 5 of 7 biography lines | statement, portrait 100%, 6 of 9 | statement, portrait 100%, 3 of 10 |
| Largest blank interval | 72px (band) | 72 | 72 |

The page alternates writing and imagery without long runs of either:

statement · portrait · two paragraphs · rule · evidence + answer · line · image · slot · line · experience

There is no giant paragraph, and no stack of giant images. It reads as a profile, not a feed.

## 12. Navigation (not designed; recorded only)

- The wordmark wraps to **2 lines at 480 and below**, and the header grows from 46 to 53–57px.
- Nav link hit height is **14–16px (under 44) at every width**.
- No collision, and the header takes 6–7% of the first screen.

These are carried to the site-wide mobile navigation work.

## 13. Semantic / accessibility order

- **Heading outline:** h1 "About me" → h2 "Selected experience". Before this, the page had no h1.
- **DOM = reading = visual order at all widths.** Keyboard order runs header links → email, since the page has no other focusables.
- **Portrait:** meaningful `alt` ("Nguyen Khanh Nhat") plus a `figcaption`.
- **Process images:** `alt=""`, but each sits in a `figure` whose `figcaption` describes it. They are evidence tied to captions, so no content is image-only.
- No information depends on position alone. Current page is marked with `aria-current` on "About".

## 14. Full-page rhythm

| Viewport | Page | Screens | Portrait | Largest blank | Largest image | Overflow |
|---|---|---|---|---|---|---|
| 1440×1000 | 2482 | 2.5 | 429×666 | 112 | 666 (67%) | none |
| 1024×900 | 2356 | 2.6 | 291×451 | 112 | 451 (50%) | none |
| 768×1024 | 2484 | 2.4 | 225×350 | 96 | 351 (34%) | none |
| 699×900 | 3096 | 3.4 | 267×414 | 72 | 435 (48%) | none |
| 600×900 | 2926 | 3.3 | 267×414 | 72 | 414 (46%) | none |
| 540×900 | 2840 | 3.2 | 267×414 | 72 | 414 (46%) | none |
| 480×900 | 2778 | 3.1 | 267×414 | 72 | 414 (46%) | none |
| 430×932 | 2744 | 2.9 | 276×428 | 72 | 428 (46%) | none |
| 390×844 | 2692 | 3.2 | 250×388 | 72 | 388 (46%) | none |
| 375×812 | 2706 | 3.3 | 241×374 | 72 | 374 (46%) | none |

The largest blank interval is always one band (112 / 96 / 72). No accidental voids were measured.

**At 699 the full-measure atelier image is 651px wide (48% of the screen)**, the largest non-portrait image on the page. It is proportionate, and not a failure.

There is no width at which the page stops reading as composed.

## 15. Shared system methods consumed (A)

- The display-typography method (`clamp(min, coef × 100cqw, max)`), for the Marcellus email line.

## 16. About-specific derivations (B)

1. **Opening authored in narrow reading order:** statement → portrait → biography → evidence, placed by grid at desktop.
2. **Tiers:** desk ≥ 1024, tab 700–1023, phone < 700. Edge 56/32/24, gutter 20/14/10, band 112/96/72. Opening top 74/60/44, pair sections 86/72/56.
3. **Phone portrait:** `min(content, 0.46H × 0.6445)`, right-hung, with the caption as a margin note when it fits (void ≥ caption + 16px).
4. **Pairs stack** when the text column is under 300px. The tablet offsets images to the opposite side (process cols 4–12, slot cols 1–9). Phone uses full measure.
5. **Evidence image:** 70.6% on desktop and tablet, full measure on phone.
6. **Experience:** label above the list below 1024. The list is cols 1–10 on tablet and full width on phone. Row gap 26 → 16 on phone. Year column kept beside the role.
7. **Contact:** stacks below 1024 and left-aligns. The email is `clamp(20px, 6.06cqw, 26px)` of its box.
8. **Opening statement:** 24px, down to 21px below 600.
9. **Semantics:** h1 on the marker; portrait wrapped in `figure` / `figcaption`.

None of these is promoted: not the portrait rule, the offsets, the stacking order, the experience layout or the email coefficient.

## 17. Unresolved (non-blocking)

1. Header wordmark wraps at 480 and below, and nav targets are under 44px. Both belong to the site-wide mobile navigation work, which is unresolved.
2. At 375 the caption margin note doesn't fit (86px void), so the caption falls back below the portrait. A deterministic fallback, but visible as the only width with a different caption position.
3. The phone portrait is a constant 267×414 from 480 to 699 (the H-derived cap at H 900). The lateral void grows to 384px at 699, used by the caption. The Owner should judge this by eye at 699.
4. The 1024 desktop tier stacks the process pair (213px text column) while 1440 keeps it side by side. That is correct under the rule, but it is a visible desk-tier difference.
5. Carried publication gaps (not responsive): the on-set operating frame, a second portrait, About-owned process frames, the portrait master file, and final copy.

## 18. Maturity recommendation

**Recommend: RESPONSIVE VALIDATED — candidate.** The evidence supports it and nothing was forced.

- **Portrait:** resolved. Native aspect at every width, capped at 46% of the screen on phone, and inside the first screen.
- **Narrow reading order:** works. Writing first, identity within the first screen, and DOM = visual.
- **Asymmetry:** intentional. Right-hung portrait, margin caption, opposite-side offsets on tablet, and a partial rule kept.
- **Experience:** aligned rows at every width, including long entries.
- **Imagery and captions:** native aspect, and captions bound as `figcaption` at +11–12px.
- **Page:** no overflow, and no unresolved visual blocker.

Items 2–4 in §17 are judgement calls, not failures. Still **not Design Approved, not production-ready, not implementation complete.**

## 19. Files

Created:

- `docs/design/prototypes/about/About Me 3B v2 Responsive.dc.html`
- `docs/design/prototypes/about/about-me-3b-v2-responsive.md`

Modified: none. Not staged, not committed, not packaged.
