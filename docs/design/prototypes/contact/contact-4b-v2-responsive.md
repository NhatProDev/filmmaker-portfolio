# Contact — 4B v2 responsive validation

- **Date:** 2026-09-24
- **Status:** Responsive page validation. **Nothing approved.** No design document, spec, ADR, schema or page candidate was modified.
- **Prototype:** `Contact 4B v2 Responsive.dc.html` (this directory)
- **Desktop candidate:** `Contact 4B v2.dc.html` is **untouched**
- **Consumes:** the display-typography method (heading and email)

All figures below come from rendered geometry. The prototype recomputes a page matrix, a first-screen table, a 1px scan from 520 to 1030px and a touch table at run time, and shows a live audit.

## 1. Viewports tested

- **Standard:** 1440×1000, 1024×900, 768×1024, 699×900, 600×900, 480×900, 430×932, 390×844, 375×812.
- **Short phone:** 375×667.
- **1px scan:** every integer width from 520 to 1030 at H 900, looking for any change of tier, heading bound, row mode, email fit, overflow or footer line count.

**The scan found exactly one state change: 684 → 685** (single column → locked grid). There is no non-monotonic band and no intermediate failure.

## 2. Desktop preservation (1440)

| | Locked | Derivative | |
|---|---|---|---|
| Spine | cols 1–7, 766px | 766px | ✓ |
| CONTACT | 21.3cqw of the spine, glyphs end 1px inside the spine | 163.2px, 100% fill, edge −1px | ✓ |
| Email | 38px Marcellus accent, 2.38× the rows | 38.0px (max engaged), 2.38× | ✓ |
| Statement, rows, closing note | 19 / 16 / 17px | identical | ✓ |
| Identity still | cols 9–12, +86px below the datum | 429×213, same place | ✓ |
| Footer | name cols 1–5 · © cols 11–12 | identical grid | ✓ |
| Page min-height | 940 | 940 | ✓ |

Visible geometry is unchanged. The semantic changes are covered in §11.

## 3. Final reading / source order

At every width:

header → datum → **CONTACT (h1)** → statement → email label → **email** → reply line → Instagram → Vimeo → Based → Travel → closing note → identity still + caption → footer.

**Source order = visual order = reading order.** The locked order holds on phone.

Moving the email above the statement was not needed. The first-screen evidence below puts the email and the reply line well inside even the 375×667 screen. Keeping the statement first keeps the locked hierarchy: name the page, say what the work is, then give the action.

## 4. Heading (CONTACT)

**Contact-specific preset:** `clamp(40px, 21.3cqw of the spine, 164px)`. In the single column the maximum becomes **96px**.

| W | Spine | Size | Fill of spine | Bound |
|---|---|---|---|---|
| 1440 | 766 | 163.2 | 100% | — (max 164 set just above) |
| 1024 | 524 | 111.5 | 100% | — |
| 768 | 405 | 86.2 | 100% | — |
| 699 | 365 | 77.7 | 100% | — |
| 600 | 536 | **96.0** | **84%** | **single max engaged** |
| 480 | 432 | 92.0 | 100% | — |
| 430 | 382 | 81.4 | 100% | — |
| 390 | 342 | 72.8 | 100% | — |
| 375 | 327 | 69.7 | 100% | — |

**Why a single-column maximum:** when the grid collapses, the spine jumps from 356px to 620px (684 → 685). With the desktop coefficient alone, CONTACT would *grow* as the viewport shrinks: 78px on the grid at 699, 132px single at 684. Capping it at 96px keeps it at or below the tablet scale.

**Cost:** from 540 to 684 the word ends short of the spine edge (84% at 600). Below about 499px it fills the spine edge-to-edge again. The minimum never engages.

## 5. Email

**Contact-specific preset:** `clamp(22px, 8.2cqw of the spine, 38px)`, with `white-space: nowrap`. The locked `word-break: break-word` is removed.

| W | Size | Share of its box | Lines | × rows |
|---|---|---|---|---|
| 1440 / 1024 | 38.0 (max) | 48 / 71% | 1 | 2.38× |
| 768 | 33.2 | 80% | 1 | 2.07× |
| 699 | 29.9 | 80% | 1 | 1.87× |
| 600 | 38.0 (max) | 69% | 1 | 2.38× |
| 480 | 35.4 | 80% | 1 | 2.21× |
| 430 | 31.3 | 80% | 1 | 1.96× |
| 390 | 28.0 | 80% | 1 | 1.75× |
| 375 | 26.8 | 80% | 1 | 1.68× |

- **One line at every width. The address never splits and never overflows.** The coefficient fixes the address at 80% of its box whenever it is below the maximum. The 1px scan found no overflow anywhere.
- It stays **at least 1.68× the metadata rows** and keeps its accent, ink rule and own label, so it remains the page's primary line.
- The minimum never engages.

## 6. Row behaviour

The rows are **label-left / value-right at every width.** The rule stacks all four rows together (label above value) as soon as any row can't hold one line. It never triggered.

The smallest spare space in a row:

| W | Smallest spare |
|---|---|
| 1440 | 535px |
| 768 | 174px |
| 600 | 305px |
| 430 | 151px |
| 375 | **96px** (Vimeo) |

Rhythm and alignment are unchanged: 11px padding and hairline rules. `rows: stack` is available as a comparison.

## 7. Identity still

- **Desk and grid tiers (≥ 685):** kept as the locked margin element in cols 9–12. Sizes: 429×213 at 1440, 225×112 at 768, 202×101 at 699.
- **Single column (< 685):** **relocated to its DOM position after the closing note**, hung from the right edge at **60% of the measure**. Sizes: 322×160 at 600, 196×98 at 375. It keeps native aspect and never appears above the action.
- It is never full width, so it is never the loudest element on the page.
- **Omission stays valid** (`identity: absent`), as the locked record requires.
- No new image was introduced.

## 8. Footer

- **Desktop:** the locked grid.
- **Below 1024:** a single justified flex line. The name is held as two non-breaking halves: "Nguyen Khanh Nhat" and "— cinematography and photography".
  - Up to 480 it sits on **1 line**.
  - At **430, 390 and 375** it breaks **at the dash only**, giving 2 lines.
  - **© 2026 stays on the first line**, right-aligned, at every width.
- No mid-phrase fragments. The copy is unchanged; only the break point is controlled.

## 9. Breakpoints and margins (Contact-specific)

```text
desk     ≥ 1024       locked geometry · edge 56 · gutter 20
grid     685 – 1023   locked 12-col grid (spine 1–7, still 9–12) · edge 32 · gutter 14
single   < 685        one column · edge 32 (≥ 600) / 24 (< 600) · gutter 14 / 10
```

**The 685 switch is measured, not inherited.** The grid holds while its 7-column spine can still carry the statement's own measure (34ch at 19px, 356px). It collapses the first width at which it can't.

This is not About's 700: About's phone tier is a round tier, while Contact's switch comes from its own statement. The 1024 desk threshold coincides with the other pages but is still Contact's call: it keeps the locked 56px edge, and the grid below survives.

Vertical spacing for desk / grid / single:

| | desk | grid | single |
|---|---|---|---|
| Sheet top | 74 | 60 | 40 |
| Email block top margin | 54 | 48 | 40 |
| Footer top / bottom | 90 / 54 | 72 / 43 | 54 / 32 |

Page min-height is 940 on desk and the viewport height elsewhere, so the footer sits at the bottom of short pages.

## 10. Short screen — 375×667

| | y (px) |
|---|---|
| Header height | 53 |
| Email | 395–442 |
| Reply line ends | 461 |
| Last row (Travel) ends | **656** |

**The email, the reply line and all four rows fit inside the first 667px screen.** Nothing is clipped or cut off, and spacing stays usable. The closing note, still and footer follow on scroll.

The same holds at 430×932, 390×844 and 375×812, where the email sits at y 395–406.

## 11. Accessibility and semantic changes

1. **CONTACT is now the page `h1`.** It was an `h2` with no `h1` on the page. Its styling is unchanged.
2. **The content sheet is `main`.** The section is now a `main` element.
3. **Focus: a Contact-specific ink ring.** It is `a:focus-visible { outline: 2px solid ink; offset 4px }`, with 6px on the email.
   - It replaces the locked JavaScript focus/blur handlers, which also drew the ring on mouse click.
   - It replaces the shared accent ring for this page. The primary link *is* accent-coloured, so an accent ring would read as part of the link. Ink on the surface is about 16:1.
   - This is not applied site-wide.
4. **Touch targets below 1024:**
   - Row links are **44px** high: the underline moves from border to text-decoration, then 14px padding with negative margin, so the visible rows are unchanged.
   - The email is **47–59px** high.
   - Desktop keeps the locked 19px pointer targets.
5. **Current page:** `aria-current="page"` on the Contact nav item.
6. **Not colour alone:** social links keep an underline, and the email keeps its label and rule.
7. **Overflow:** none at any tested or scanned width.

## 12. Contact-only responsive rules

1. The desk / grid / single tiers, with the **measured 685 collapse**.
2. Heading `clamp(40px, 21.3cqw, 164px)` of the spine, with **max 96px in the single column**.
3. Email `clamp(22px, 8.2cqw, 38px)` of the spine, on one line, with no word-break.
4. Rows stay side by side, and stack as a set only if any row fails.
5. The identity still moves after the closing note in the single column, right-hung at 60%.
6. Footer: a justified flex line below 1024, broken only at the dash, with © kept on the first line.
7. The ink focus ring.
8. 44px link targets below 1024.
9. The spacing tiers in §9.

None of these are promoted.

## 13. Site-wide issues intentionally deferred

- The header wordmark wraps to **2 lines at 480 and below**, and the header grows from 46px to 53–57px.
- **Nav links are 14–16px high (under 44)** at every width.
- Both belong to the site-wide mobile navigation, which is not solved here.
- Only density was adjusted: the gap and font size, the same treatment used on the other validated pages.

## 14. Remaining provisional content

These are unchanged and still placeholders:

- `hello@khanhnhat.film`
- the Instagram handle and link (`#top`)
- the Vimeo handle and link (`#top`)
- Based (Hanoi, Vietnam · GMT+7)
- Travel (Regional, with notice)
- the availability wording
- the reply-time promise
- the identity still (`mtm-shopfront.jpg`, borrowed) and its caption

## 15. Non-blocking visual concerns

1. **540–684:** CONTACT ends short of the spine edge (84% at 600) because of the single-column maximum. This is intentional; the Owner should judge it by eye.
2. **685 jump:** the page goes from the single column to the grid in one step. The spine goes from 620 to 356px and the email from 38 to 29.2px. It is a clean layout change, not a failure.
3. **Email share of its box:** 80% below the maximum, with more slack at desk. A future real address will be longer or shorter. The coefficient is address-agnostic up to 20 characters at this face; a longer real address needs QA.
4. **Smallest row slack is 96px at 375** (Vimeo). A longer real handle could trigger the stacked rows, which are built and valid.

## 16. Maturity

**RESPONSIVE VALIDATED — candidate.** The page holds together at every required width and the short phone, with one clean collapse, no overflow and no split address. All ten decisions are resolved.

It is **not Design Approved and not implementation complete.**
