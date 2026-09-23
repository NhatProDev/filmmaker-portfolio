# Art Works — 2C v2 responsive validation

## 000. Locked responsive findings

Accepted by the Project Owner on 2026-09-23.

**Status: RESPONSIVE VALIDATED — candidate.**
**Not** Design Approved · **not** production-ready · **not** implementation complete.

No design document, spec, ADR, schema or OpenAPI is modified. `Art Works 2C v2.dc.html` and `art-works-2c-v2.md` are **not rewritten**; they remain the historical desktop record.

### Final responsive structure

```text
≥ 1171px     locked Art Works count-aware desktop packer · desktop index structure
700–1170px   responsive grouped / shared rows treatment · per-row index
540–699px    Art Works-specific PAIRS · per-row index
< 540px      one-frame-per-row contact sheet · per-row index
```

**1171px is Art Works-specific evidence. It is not a global breakpoint.**

### Desktop takeover

1. **1171px is the lowest continuous passing takeover width.** At 1171:
   - all 3 / 9 / 18-project count-aware layouts pass
   - the smallest 18-project frame is **120px** wide
   - the plate treatment fits
   - there is no horizontal overflow
   - displayPosition order holds
2. **1024–1170 stays responsive.** The locked packer has failing width bands there: 1024, and 1124–1170, where the portrait is squeezed.
3. **The 1170 → 1171 transition is not smoothed.**

### 540–699 pairs

4. Consecutive projects pair in displayPosition order and share one row height.
5. Widths come from each frame's native aspect.
6. No crop, no masonry, no hiding, no reordering. The plate numeral and the per-row index are kept.
7. Page height is **51–65% lower** than one-up.
8. **Portrait items stay in ordinary paired rows. There is no portrait special case.** The `midBand: portraitRow` tweak is rejected comparison evidence only.

### Below 540 (phone)

9. **One frame per row.** Two-up below 540 stays rejected: media becomes too small, the plate treatment fails, titles wrap more and identification weakens.
10. **The 540 layout jump is accepted** as non-blocking evidence.

### Title system

11. Dynamic project names use a **Newsreader-backed `font-display` preset**: `clamp(18px, 1.506cqw, 20px)`, line-height **1.15**. These values are Art Works-specific; Project Detail's values are not reused.
12. The **Works heading stays Marcellus.** There is no language-dependent face switching.

### Identification

13. Plate numerals appear on every frame.
14. The desktop index is used in desktop mode. Below the takeover width, each row carries its own index entries.
15. Numeral, title, year and order keep the same relationship in every mode. Narrow layouts do not depend on hover.
16. Touch activation opens the project. No selected-state system is needed.

### Moving preview

17. At most **one** moving preview, and at most **one** loaded preview source.
18. No audible autoplay. **Tapping does not start a preview.**
19. With reduced motion, no moving preview loads; every frame shows a deterministic poster.
20. **No new global `AUTOPLAY_VISIBLE` threshold** is established.

### System boundary

21. **JUSTIFIED_ROWS stays a valid shared candidate, and its algorithm is unchanged.** Art Works uses:
    - shared responsive rows from 700 to 1170
    - its locked count-aware packer on desktop
    - page-specific pairs from 540 to 699
    - one-up (shared rows, T = 1) below 540

### Non-blocking, carried forward

- The 1171 takeover sits exactly at the 120px minimum for the current content.
- Future portraits with more extreme aspects need content QA.
- Touch-only wide devices need real-device QA.
- Site-wide mobile navigation is unresolved.
- The global `AUTOPLAY_VISIBLE` threshold is unresolved.
- Multiple media per project is future content-model QA.

**None of these blocks responsive candidate maturity.**

---

## 00. Pass 3 — desktop takeover threshold (2026-09-23)

Only the desktop takeover width was reopened. Everything accepted in passes 1–2
is unchanged.

### 00.1 Boundary search

The locked count-aware packer was run as a pure computation at **every integer
width from 1024 to 1440** for 3, 9 and 18 projects. Pass condition: every cell
**≥ 120px wide** (plate numeral + 120×62 scrim) and ≥ 62px tall.

| Failing widths | Cause |
|---|---|
| **1024** | 18 projects: tail `[15 16 17 18]` at 157px → 101px cell |
| **1124 – 1167** | 9 and 18: a 4-item row with the 0.645 portrait solves to 117–119px wide |
| **1170** | same row, 119px |

**Last failing width: 1170. Every width from 1171 to 1440 passes for all
three counts.**

The failure is **not monotonic** — the packer passes at 1025–1123, then fails
again at 1124–1170 as a portrait enters a 4-item row. A threshold anywhere
below 1171 would admit a failing band. **1171 is the lowest width above which
the locked packer is safe at every count.**

### 00.2 Selected

```text
≥ 1171       locked Art Works count-aware desktop packer · stacked index
700 – 1170   JUSTIFIED_ROWS v2 verbatim · per-row index        (T 3 ≥ 1024, T 2 below)
540 – 699    Art Works PAIRS · per-row index                   (unchanged)
< 540        JUSTIFIED_ROWS v2 verbatim one-up · per-row index (unchanged)
```

The per-row index threshold moves with the packer (1024 → 1171), so structure
and packer switch together — no stacked-index + JUSTIFIED_ROWS hybrid exists.
The 1024–1170 band was **already** grouped JUSTIFIED_ROWS territory in
principle; JUSTIFIED_ROWS verbatim there was checked at every integer width
700–1170: **narrowest cell 120px** (831 × 18), never below.

Art-Works-specific. Not promoted.

### 00.3 Smallest frame, 18 projects (rendered)

| W | Sheet | Rows | Smallest | Plate |
|---|---|---|---|---|
| 1024 | grouped JR | 3×6 | 147 × 167 | ✓ |
| 1100 | grouped JR | 3×6 | 157 × 179 | ✓ |
| 1152 | grouped JR | 3×6 | 166 × 188 | ✓ |
| 1170 | grouped JR | 3×6 | 167 × 191 | ✓ |
| **1171** | **locked** | 3/3/4/3/3/2r | **120 × 186** | ✓ (at minimum) |
| 1200 | locked | 3/3/4/3/3/2r | 123 × 190 | ✓ |
| 1280 | locked | 3/3/4/3/3/2r | 131 × 203 | ✓ |
| 1366 | locked | 3/3/4/3/3/2r | 140 × 217 | ✓ |
| 1440 | locked | 3/4/4/3/4 | 142 × 188 | ✓ |

For comparison, the rejected state was the locked packer at 1024: 101 × 157 ✗.

### 00.4 3 / 9 / 18 at the threshold (1171 × 900)

| n | Rows | Heights | Smallest | Page | Locked intent |
|---|---|---|---|---|---|
| 3 | 2 / 1r | 288, 420 | 579 × 288 | 1228 | ✓ fewer, larger frames (420 ragged tail) |
| 9 | 2 / 3 / 4 | 288, 209, 186 | 120 × 186 | 1298 | ✓ count-aware 300 target |
| 18 | 3/3/4/3/3/2r | 200–250 | 120 × 186 | 1917 | ✓ count-aware 250 target |

Order ✓, native aspect ✓, overflow none, plate ✓ everywhere. Index↔frame
correspondence is the locked desktop mechanism (numerals + hover/focus
pairing); at-rest coverage 28–67% as recorded for desktop in pass 1 §5.

### 00.5 Below / above the breakpoint (1170 → 1171, H 900)

| n | 1170 grouped JR | 1171 locked | Change |
|---|---|---|---|
| 3 | 1 row of 3 at 199 · page 571 | 2 + 1r at 288 / 420 · page 1228 | +657px, frames enlarge — the locked 3-project intent |
| 9 | 3/3/3 · 199–260 · page 1192 · min 167 | 2/3/4 · 186–288 · page 1298 · min 120 | +106px |
| 18 | 3×6 · 191–262 · page 2077 · min 167 | 3/3/4/3/3/2r · 186–250 · page 1917 | −160px |

Frames in first screen: 3 / 6 / 6 → 3 / 5 / 6. Index moves from per-row
strips to the stacked desktop index.

**A layout change, not a cliff** for 9 and 18 (page height ±5–8%). The 3-project
case roughly doubles in height because the locked desktop deliberately shows
three projects large — that is the Owner-locked composition taking over, not a
defect. No interpolation added.

### 00.6 Carried, non-blocking

- **540 step** (pairs → one-up) — accepted, recorded in pass 2 §0.4.
- **1171 runs at the plate minimum** (120px). Any wider is safer; narrower is
  not admitted. A future library with a narrower-than-0.645 portrait could
  starve the locked packer above 1171 — the packer has no floor. Recorded for
  the Owner, not fixed (desktop packer is locked).
- **Touch-only devices ≥ 1171** receive the desktop index structure — pass 1 §17
  item 9, unchanged.
- Remaining pass-1/2 carried items unchanged.

### 00.7 Maturity

The 1024 × 18 plate failure is resolved by an evidence-backed takeover at
**1171px**, with no new blocker. **Recommend: RESPONSIVE VALIDATED —
candidate.** Not Design Approved, not production-ready, not implementation
complete.

### 00.8 Files (pass 3)

Modified: `Art Works 2C v2 Responsive.dc.html` · `art-works-2c-v2-responsive.md`.
Locked desktop prototype, governance, ADRs, schema, OpenAPI untouched. Not
packaged, staged or committed.

Supersedes: pass 2 §0.1 "≥ 1024 locked packer" and §0.5 structure (→ 1171) · pass 2 §0.6
(resolved) · pass 1 §5 grouping threshold 1024 (→ 1171).

---

## 0. Pass 2 — 540–699 density hardening (2026-09-23)

Only the 540–699 band was reopened. Everything the Owner locked stays as recorded in pass 1:

- the Newsreader title preset and Vietnamese rendering
- the per-row index below 1024 and no-hover identification
- plate numerals, the one-preview policy and reduced motion
- order, touch targets, no overflow, and one frame per row below 540

### 0.1 Owner decisions applied

- **≥ 1024px: the locked Art Works count-aware desktop packer** is the default (`sheet: locked`). JUSTIFIED_ROWS v2 is **not** used here and is **not** modified. It stays reachable as `sheet: verbatim`, for comparison only.
- **Below 540px: one frame per row**, using JUSTIFIED_ROWS v2 verbatim at T = 1. The per-row index sits directly above each frame. Native aspect and the plate numeral are kept. Not reopened.

### 0.2 Candidates compared at 699, 600 and 540 (H 900) for 3, 9 and 18 projects

- **A — one-up.** The current state: JUSTIFIED_ROWS v2 verbatim at T = 1.
- **B — pairs.** Art Works only. Consecutive items pair in displayPosition order at one shared row height, with widths taken from native aspect: `h = (W − 4) / (ar₁ + ar₂)`. Nothing is cropped, there is no masonry, and nothing is reordered. A lone last item keeps the previous row's height. It grows only as far as the plate needs (120px wide), so it never becomes a new, larger scale.
- **C — portrait on its own row.** B, except that any item with an aspect below 1 stands alone at `min(W / ar, 0.6H)`. This was tested because the brief asked for it.

| W | n | A one-up: page / screens | B pairs: page / screens | C: page / screens |
|---|---|---|---|---|
| 699 | 3 | 1534 / 1.7 | 724 / 0.8 | 736 / 0.8 |
| 699 | 9 | 4260 / **4.7** | 1522 / **1.7** | 1863 / 2.1 |
| 699 | 18 | 7638 / **8.5** | 2715 / **3.0** | 3475 / 3.9 |
| 600 | 3 | 1381 / 1.5 | 674 / 0.7 | 685 / 0.8 |
| 600 | 9 | 3793 / **4.2** | 1417 / **1.6** | 1758 / 2.0 |
| 600 | 18 | 6772 / **7.5** | 2456 / **2.7** | 3282 / 3.6 |
| 540 | 3 | 1291 / 1.4 | 676 / 0.8 | 686 / 0.8 |
| 540 | 9 | 3507 / **3.9** | 1398 / **1.6** | 1739 / 1.9 |
| 540 | 18 | 6247 / **6.9** | 2384 / **2.6** | 3224 / 3.6 |

**B, measured in detail:**

| W | Smallest cell | Frames visible (first screen / mid-sheet screen) | Title lines (sample titles) | Plate fits |
|---|---|---|---|---|
| 699 | 169×170 (n = 18), 120×172 (n = 9 tail) | 6 / 6 | 1 | ✓ |
| 600 | 145×146 | 6 / 6 | 1 | ✓ |
| 540 | 130×131 | 6 / 6–8 | up to 2 | ✓ |

For comparison, A shows 2 frames in the first screen and 2–4 in a mid-sheet screen.

Rules B holds in all nine states:

- **Identification:** 100% of frames have their own index entry on screen when the frame is centred, with no hover.
- **Aspect and order:** native aspect ✓ and displayPosition order ✓.
- **Preview eligibility:** unchanged (3, 6 and 12 eligible frames), and the one-preview policy is unchanged.
- **Moving previews:** at most one moving and one source loaded at every scroll position tested (600 × 18: active #3 → #8 → #11 → #15).

**Stress titles in B** (9 projects; positions 1–6 carry the long Vietnamese and English titles):

- **Glyphs and clipping:** every title renders from one face, and nothing clips.
- **Line counts:** the long Vietnamese title takes 3 lines at 699 and 600, and 2 at 540. The long English title takes 2.
- **Entry heights:** every index entry is 44–81px high, so all are at least 44px ✓.

### 0.3 Portrait / extreme-aspect behaviour

| Case | A one-up | B pairs | C portrait row |
|---|---|---|---|
| 18 projects, position 9 (portrait paired with the next item) at 600 | 242×375, **42% of screen height**, 60% empty width | **159×246, 27%**, shares a full-width row | 348×540, **60%**, 42% empty |
| 9 projects, portrait is the lone last item, at 600 | 242×375, 42% | **120×186, 21%**, 80% empty | 348×540, 60%, 42% empty |

- **B keeps the portrait inside a justified row.** The row with the portrait is taller: 246 against 146px at 600. That is the same justified-row variation JUSTIFIED_ROWS produces elsewhere, not masonry, and order stays unambiguous.
- **Odd counts end on a lone item.** With 3 projects, the last 2:1 frame sits at the same height as the row above, with 56% empty width. With 9 projects, the portrait tail is 120×186 (1.27× the row height) with 78–83% empty width.
- **This tail is the one visual imbalance in B.** It is bounded and deterministic, it never becomes a new scale, and it is less dominant than the same portrait in A (21% against 42% of the screen).
- **C is rejected.** The lone portrait occupies 60% of the screen, 18 projects cost +0.9 screens over B, and it adds a portrait special case.

### 0.4 Selection

**Selected: B — pairs, for 540 ≤ content width < 700.** It meets all five conditions of the selection rule:

1. **Identification kept:** 100% in every state.
2. **Native aspect kept:** ✓ in every state.
3. **Density materially improved:** page height falls by **51–65%**.
   - 9 projects: 4.7 → 1.7 screens at 699, 4.2 → 1.6 at 600, 3.9 → 1.6 at 540.
   - 18 projects: 8.5 → 3.0, 7.5 → 2.7, 6.9 → 2.6.
   - Frames on screen: 6 against 2.
4. **Still reads as a contact sheet:** paired frames in order under their own index entries, at the same visual scale as 700–1023.
5. **One rule:** "pair in order, shared height". The only exception is the tail's plate minimum.

**Continuity:** B at 699 (1522px for 9 projects) lines up with grouped JUSTIFIED_ROWS at 768 (1648px), so the old 700px cliff (1.6 → 4.7 screens) is gone. The remaining step is at **540**, where B's 132px frames give way to one-up 265px frames. That step comes from the Owner-locked phone rule and is recorded, not smoothed.

### 0.5 Final structure

```text
≥ 1024       locked Art Works count-aware desktop packer · stacked index
700 – 1023   JUSTIFIED_ROWS v2 verbatim (T = 2) · per-row index
540 – 699    Art Works PAIRS · per-row index                 (this pass)
< 540        JUSTIFIED_ROWS v2 verbatim (T = 1, one-up) · per-row index
```

The bands are measured against the sheet's own content width, which is full bleed and equals the viewport width. **Art Works only; none of it is promoted.**

### 0.6 Carried finding, not a new blocker

The **locked desktop packer at 1024 × 18** produces a **101px-wide cell**, below the 120px the plate numeral and its dark corner need. The pass-1 matrix marks it ✗. This is the locked desktop's existing starved-cell defect, noted in `page-specifications.md` §2.7 item 3. It is kept because Owner decision 1 locks that packer. It is recorded for the Owner and not changed here.

### 0.7 Remaining questions (non-blocking)

1. Odd-count tail in B: a lone item leaves 56–83% empty width (§0.3).
2. The 540 step from B to one-up, which comes from the locked phone rule.
3. The locked desktop 1024 × 18 cell at 101px (§0.6).
4. Carried from pass 1 §17:
   - multiple media per project
   - the plate numeral's source
   - phone autoplay data cost
   - site-wide mobile navigation
   - touch-only devices at 1024 and wider
   - the system evidence that a ragged tail can overtop the rows above it

### 0.8 Maturity

**Recommend: RESPONSIVE VALIDATED — candidate.** The 540–699 band is resolved on measured evidence and no new blocker was found. Not Design Approved, not production-ready, not implementation complete.

### 0.9 Files (pass 2)

Modified:

- `Art Works 2C v2 Responsive.dc.html`
- `art-works-2c-v2-responsive.md`

The locked desktop prototype, governance documents, the responsive-system experiments and the ADRs are untouched. Nothing is packaged, staged or committed.

**Superseded pass-1 items:**

| Pass-1 section | Superseded by |
|---|---|
| §2 desktop packer | Owner decision 1 (§0.1) |
| §9 540–699 finding | §0.2–0.4 |
| §17 items 1–2 | §0.4 and §0.1 |
| §18 | §0.8 |

---

# Pass 1

- **Date:** 2026-09-23
- **Status:** Responsive page validation. **Nothing approved. No design document, spec, ADR, schema or page candidate modified.**
- **Prototype:** `Art Works 2C v2 Responsive.dc.html` (this directory)
- **Desktop candidate:** `Art Works 2C v2.dc.html` — **untouched**
- **Consumes:** JUSTIFIED_ROWS v2 · display-typography method · Art Works one-preview policy (locked, `art-works-2c-v2.md` §0)
- **Locked input applied:** dynamic `p.title` strings use a Newsreader-backed `font-display` preset (`page-specifications.md` §2.7)

The prototype recomputes four tables at run time. They cover 3, 9 and 18 projects × 11 viewports, the desktop packer comparison, the title preset and a narrow-density probe. A live audit covers the current frame. Every number below is read from rendered geometry.

## 1. Viewport coverage

The tested viewports are 1440×1000, 1024×900, 768×1024, 699×900, 600×900, 540×900, 480×900, 450×900, 430×932, 390×844 and 375×812. Each ran at 3, 9 and 18 projects, which gives 33 page states. The title preset was tested at 1440, 768, 430 and 375.

No constrained-height case was added, because none revealed a failure beyond what the standard heights already show.

## 2. Desktop equivalence at 1440

| Element | Result |
|---|---|
| Index/sheet structure, masthead, header, count | ✓ identical structure |
| Plate numerals, one pairing routine for hover and focus, frame as transition origin | ✓ locked code path carried over |
| One-moving-preview policy | ✓ 1 moving, 1 source loaded, 6 eligible |
| Source order | ✓ index 1…n and sheet 1…n, in both DOM and tab order |
| **9 projects** | ✓ **identical**: `[1 2 3]246 [4 5 6]257 [7 8 9]321`, verbatim and locked |
| **3 projects** | **✗ differs.** Locked: `[1 2]355 [3]420 ragged`. Verbatim: `[1 2 3]246` |
| **18 projects** | **✗ differs.** Locked: all rows flush. Verbatim tail: `[17 18]298 ragged` |
| Index type | Newsreader 20px replaces Marcellus 22px at equal fill (§3) |

**The cause is the page's own packer.** The locked desktop used a count-dependent target (420 / 300 / 250) and an unconditional 40% orphan merge. The shared candidate has a fixed reference of 1.6 and neither of those. At 9 projects the two agree exactly. At 3 and 18 they do not:

- **3 projects:** verbatim packing produces one strip of three frames at 246px. That loses the locked intent of "fewer, larger frames when there is less work".
- **18 projects:** the verbatim tail is 2 frames, 599 + 192px wide, which leaves **45% empty width**. The tail is also **298px tall against 229–257px** for the rows above it.

The 18-project tail is the **same system behaviour Project Detail recorded**. A tail held at `target` overtops full rows that solve below target. This is now seen on two pages and is raised as **system evidence (§17)**. It is not a page fix.

The `sheet: locked` tweak renders the locked packer for comparison.

**The desktop is not silently redesigned.** Both divergences need an Owner decision (§18).

## 3. Art Works Newsreader title preset (Art Works only)

| | Value | Basis |
|---|---|---|
| Face | Newsreader 400, uppercase, −0.005em | locked input |
| Reference box | the **12-column index composition**: the content box of the index/sheet composition | the box the index aligns to at every count |
| Coefficient | **1.506cqw** | 22px Marcellus becomes **20px** Newsreader at equal fill (measured advance ratio 0.908), and 20 / 1328 = 0.01506 |
| Max | **20px** | load-bearing, engaged at 1440 |
| Min | **18px** | **load-bearing, engaged at every width below about 1195px** |
| Line-height | **1.15** | wrapped index entries |
| Hover caption (desktop only) | 17px, same face | 19px Marcellus at equal fill |

**Finding:** at index scale the method degenerates to its bounds, 20px on desktop and 18px on narrower screens. The coefficient only operates between 1195 and 1328px of content width. That is honest evidence, not a defect. This role is a small display size, so the bounds carry it.

I chose the column-independent reference deliberately. Using the index *column* would shrink 18-project desktop titles by 34% compared with 9 projects, because 3 columns are 429px wide against 654px for 2. That would break desktop equivalence across counts.

**Static Latin masthead:** "Works" stays in **Marcellus**. It uses `clamp(34px, 8.87cqw, 58px)` of cols 1–6, and the minimum engages below 600px.

## 4. Vietnamese title result

I tested seven strings at 1440, 768, 430 and 375:

- Short English: SKETCH
- Medium English: MADE TO MEASURE
- Long English: THE LAST FITTING AT TRẦN & SONS
- TRẦN
- NGUYỄN
- Medium Vietnamese: MÙA THU HÀ NỘI
- Long Vietnamese: NGƯỜI THỢ MAY CUỐI CÙNG Ở PHỐ HÀNG BÔNG

- **Glyph fallback:** none. **Every string rendered from one face** at every width (the fallback-stack width test found 0 fallback glyphs).
- **Clipping:** none (`scrollWidth ≤ clientWidth` for every title).
- **Line count:** 1 line everywhere except these:
  - Long Vietnamese: 2 lines at 768, 430 and 375.
  - Long English: 2 lines at 375.
  - Entry height is **60px** on 2 lines and **44px** on 1 line.
- **No per-language switching.** One preset covers both languages.

## 5. Index responsive behaviour

**Result: B. It needs a derived narrow-screen structure.** Reflowing the stacked index does not survive, and the evidence below shows why.

**Identification coverage without hover** measures how many frames have their own index entry at least 60% on screen when the frame is centred:

| | 1440 | 1024 |
|---|---|---|
| 9 projects, stacked | 44% | 78% |
| 18 projects, stacked | 22% | 28% |

On desktop, hover and focus supply the rest, and that is the locked mechanism. On touch, **more than half the frames cannot be named without scrolling back to the index**. At 18 projects on a phone, a stacked single-column index would be **805px, a whole screen of text before any media**.

**The derived structure, grouped** (below 1024px):

- The index is **not collapsed into a list, and not removed**. Its entries are **distributed into the sheet**: each packed row carries its own index entries in a strip directly above its frames.
- Each entry sits at its frame's x-position and width. Its numeral is inset 13px to line up with the plate numeral below.
- The entries keep the same typography: rule, numeral, title and year. The rule is ink rather than hairline, so it reads as a row head.
- On one-up rows this is simply the index entry above its frame.
- Entries narrower than 260px stack the numeral and year above the title.

Identification coverage is **100% at every width and every count** in grouped mode, and nothing depends on hover.

**Index density (the height of the index strips, summed):**

| Projects | 768 | < 700 |
|---|---|---|
| 3 | 88px | 132px |
| 9 | 233px | 409px |
| 18 | 421px | 805px |

The same text is now spent where it identifies media rather than in front of it.

**Threshold:** grouping applies below **1024px**, which is where touch-first tablets begin. It is available as a tweak with values 1024, 700 and never. It is independent of the sheet's own T 3/2/1 thresholds. At 768 the grouped strips carry two entries side by side over a 2-up row.

## 6. No-hover / touch identification

| Question | Answer (evidence) |
|---|---|
| Which media belongs to which project? | Below 1024, the entry directly above the frame names it, 100% of the time |
| Is the plate numeral alone sufficient? | **No** once the index is off-screen (§5 coverage figures). It is kept as the cross-reference mark |
| Persistent identity at narrow widths? | **Yes**, as the index entry itself, relocated. It is **not a caption on the media** (locked decision 3 holds) |
| Does tapping a frame highlight its entry? | Not needed. Tap = open, as on desktop |
| Does tapping an entry reveal its media? | Not needed. The media sits directly below it. Tap = open |
| Explicit active state? | **Not required.** No new application state was introduced |
| Keyboard and touch? | The same pairing routine runs on focus in both modes. Touch needs no pairing because identity is at rest |

The result holds with no hover, with no media moving, and with several projects visible at once. This is an **Art Works-specific derivation**.

## 7. Plate numerals

- They are present on **every frame, at every width and every count**, in the same position (13px, 11px), the same size (12px) and with the same derived corner scrim.
- The plate and its 120×62 scrim fit every cell in all 33 verbatim states. The smallest cell is 147×… on desktop and 151×234 on phone.
- Grouped mode puts the numeral twice in one column: once in the entry, once on the plate. The correspondence becomes literal rather than remembered.
- Each project has one frame, so repeated numerals across multiple media for one project did not arise. That remains untested (§17).
- **Two-up probe (§9):** the plate scrim does **not** fit, with cells of 86×… and 75×… — one more reason the probe fails.

## 8. JUSTIFIED_ROWS, verbatim, real data

The candidate was consumed unchanged: `ref 1.6 · floor max(120, 0.10W) · ceil 1.25W · T 3/2/1`.

| n | 1440 | 1024 | 768 | ≤ 699 |
|---|---|---|---|---|
| 3 | 3 | 3 | 2/1 | 1/1/1 |
| 9 | 3/3/3 | 3/3/3 | 2/2/2/2/1 | one-up × 9 |
| 18 | 3/3/4/3/3/**2r** | 3×6 | 2 × 9 (tail 2r) | one-up. At 699–480 the two portraits pair (one 2-row); at ≤ 450 they stand alone |

- **Starved cells:** 0 of 33 states. **Native aspect:** ✓ in all 33. **Source order:** ✓ in all 33. **Crops:** none.
- **480 → 450 transition** reproduces the system record exactly at 18 projects. At 480, position 9 (portrait, 0.645) pairs with its neighbour. At 450 it stands alone **at the ceiling: 363×563**, then 347×538 at 430, 314×488 at 390 and 302×469 at 375.
- **Portrait vertical occupation:** a lone portrait at 450 takes **63% of the 900px screen**. It is bounded, deterministic and preserved, but it is the tallest single object on the page.
- **Portrait as the last item** (position 9 of 9) takes the ragged-tail height instead: 154×239 at 768 and 151×234 at 375.
- **Tails:** see §2 for the 18-project desktop ragged tail. At 768 × 18 the tail is 479×239 + 154×239, which leaves 17% empty. That is acceptable.

The algorithm is not changed.

## 9. Narrow-width density

| | 768 | 699 | 600 | 480 | 430 | 375 |
|---|---|---|---|---|---|---|
| 9: page / screens | 1648 / 1.6 | **4260 / 4.7** | 3793 / 4.2 | 3220 / 3.6 | 2970 / 3.2 | 2702 / 3.3 |
| 9: one-up frame height | — | **394** | **338** | 270 | 242 | 211 |
| 18: page / screens | 2847 / 2.8 | **7638 / 8.5** | 6772 / 7.5 | 5718 / 6.4 | 5930 / 6.4 | 5364 / 6.6 |
| Frames ≥ 50% in the first screen | 6 | 2 | 2 | 2 | 3 | 2 |

**Phones (430 and below):** one-up 2:1 frames at 184–242px, each headed by its entry, **read as a visual index of films**, a contact sheet in a single column. Three frames per screen is the page's rhythm, not a feed.

**The two-up probe** (T forced to 2, which is **not** a candidate) fails. Frames are 92–105px tall, the plate scrim no longer fits, titles wrap to 2 lines in 185px entries, and the text strips outweigh the media. Density here is not improved by making cells smaller.

**The 540–699 band fails.** When the sheet crosses T = 2 → 1 at 700, the page jumps from **1.6 to 4.7 screens** (9 projects) and **2.8 to 8.5** (18 projects). One-up frames there are **304–394px tall**, two per screen. That is **one large image after another**: the density failure the brief warns against. It is not a starved cell or an algorithm fault. It is the page-level cost of the shared T = 1 threshold meeting an all-≈2:1 library at mid widths.

The width band is real: large phones in landscape, small tablets and split-screen.

**It is recorded, not fixed.** No page-specific packing was invented. This is the one visual blocker (§18).

## 10. One-moving-preview behaviour

The locked policy is consumed unchanged: exactly one eligible frame, at least 50% visible, nearest the viewport centre. The same rule applies to pointer and touch, and it is driven by scroll position, so it does not need taps.

| Scroll position at 375 × 9 | 0 | 400 | 800 | 1200 | 1600 | 2000 |
|---|---|---|---|---|---|---|
| Moving / sources loaded | 0 / 1 | 0 / 1 | 0 / 1 | **1 / 1** | **1 / 1** | **1 / 1** |
| Active | #1 | #3 | #3 | #6 | #8 | #8 |

- **Never more than one moving, and never more than one source loaded.** The "0 moving" readings are the brief load window after a switch.
- When the active frame changes, the previous one is released (paused, source dropped).
- A frame that leaves the viewport is released.
- On phone, grouped one-up rows make "nearest centre" unambiguous: one frame is centred at a time.
- **Tap does not start a preview.** Tap opens the project, as on desktop.
- There is no audible autoplay: previews are muted and `playsinline`.
- **No threshold was needed.** Art Works consumes its existing one-active-preview concept and needs no page-specific activation percentage. The global `AUTOPLAY_VISIBLE` threshold stays unresolved and untouched.
- Should movement begin automatically on phone at all? The policy permits it within ADR-0008. Data cost is outside this validation (§17).

## 11. Reduced motion

At 375 × 9 with reduced motion: **0 moving, 0 sources loaded, no active frame**. Every frame shows its poster. Grouped entries, plate numerals and order are unaffected. No identification depends on motion, because the grouped structure identifies at rest.

## 12. Touch targets (measured)

| Surface | Measured | |
|---|---|---|
| Index entry, stacked (1440) | 654 × 48 | ✓ |
| Index entry, grouped (768 / 430 / 375) | ≥ 151 × 44; 60 when 2 lines | ✓ |
| Smallest frame (activation) | 151 × 234 | ✓ |
| Plate numeral | not interactive (`pointer-events: none`) | — |
| Header nav links (375) | about 20px text line | ✗, site-wide nav (unresolved, not solved here) |

There are no cards. The 44px is reached by the entry's own padding and rule.

## 13. Semantic order

- The project array is built in `displayPosition` order and never re-sorted.
- **Index DOM, sheet DOM, tab order and visual order all run 1…n** in every one of the 33 states.
- Grouped mode emits each row as `[entries of that row][frames of that row]`, in order. Keyboard order is entry, entry, frame, frame, and so on, which is the authored sequence at row granularity.
- The stacked desktop keeps the locked order: all entries, then all frames.
- Packing changes only row breaks.

## 14. Full-page rhythm

The §9 table covers 768 and below. The remaining widths:

| n | 1440 | 1024 |
|---|---|---|
| 3 | 782 (0.8 screens), 3 frames in the first screen | 685 (0.8), 3 |
| 9 | 1464 (1.5), 6 | 1194 (1.3), 6 |
| 18 | 2222 (2.2), 6 | 1851 (2.1), 6 |

- Horizontal overflow: **none in any of the 33 states**.
- Narrowest cell: 147–154px from 1024 to 768, 151px at phone.
- Largest cell: a lone portrait, 363×563 at 450 × 18.

**Content stress:**

- **3 projects** are not over-designed on narrow screens (1.2–1.7 screens). On desktop the verbatim single strip is **under-scaled** compared with the locked 2+1 (§2).
- **9 projects** are the intended density everywhere except the 540–699 band.
- **18 projects** are practical on phone (6.4–6.6 screens), long in the 540–699 band (6.9–8.5), and fine on desktop and tablet.
- **Pairing does not degrade with count:** grouped identification is 100% at 18.
- **The one-active-preview rule stays understandable at 18:** one frame moves, and it is the one headed by the entry you are reading.

## 15. Shared system candidates consumed (A)

1. **JUSTIFIED_ROWS v2**, verbatim.
2. **Display-typography method**, `clamp(min, coef × 100cqw, max)` against the aligned box, with its own Art Works values.
3. **Art Works one-moving-preview policy**, the locked page policy consumed unchanged, within the ADR-0008 lifecycle.
4. ADR-0008 `AUTOPLAY_VISIBLE` semantics: muted, `playsinline`, release off-screen, reduced motion.

## 16. Art Works-specific derivations (B)

1. **Grouped index below 1024:** each packed row's index entries sit directly above its frames. Entries stack when narrower than 260px. The row head is an ink rule. Rows are separated by 22px.
2. **Title preset:** Newsreader 400, `clamp(18px, 1.506cqw, 20px)`, line-height 1.15, reference = the 12-column index composition. The hover caption is 17px.
3. **Masthead:** Marcellus `clamp(34px, 8.87cqw, 58px)`. It stacks with the count below 600.
4. **Frame tiers:** edge 56 / 32 / 24, gutter 20 / 14 / 10, bottom padding 120 / 96 / 72 at 1024 and up, 600 and up, and below 600.
5. **The hover caption exists only in stacked mode.** In grouped mode it is redundant.
6. **Nav density only** (gap and size). The site-wide nav is not designed.

**None are promoted.** No global rule is proposed for touch identification, preview activation, index collapse, density or the one-column threshold.

## 17. Unresolved

1. **540–699 one-up density**: the page goes from 1.6 to 4.7 screens at 9 projects and from 2.8 to 8.5 at 18 (§9). This is the **visual blocker**.
2. **Desktop equivalence at 3 and 18 projects**: the verbatim packer replaces the locked count-dependent target (§2).
3. **System evidence, now on 2 pages:** a ragged tail capped at `target` overtops full rows solved below target (Art Works 18 at 1440: 298 against 229–257, 45% empty). Raised for the JUSTIFIED_ROWS record, not fixed here.
4. **Lone portrait at the ceiling** takes 63% of a 900px screen at 450 (§8). This is a bounded system behaviour; the Owner should judge it by eye.
5. **Multiple media per project**: numeral repetition is untested, because the data has one frame per project.
6. **Plate numeral source**: it is `displayPosition`, so it renumbers on reorder. This is carried from `art-works-2c-v2.md` §7.
7. **Phone autoplay and data cost**: the policy permits it; this is not assessed here.
8. **Header wordmark wraps at 450 and below; nav links are under 44px**: this belongs to the site-wide mobile navigation, which is unresolved.
9. **Grouping threshold of 1024**: a touch-only device at 1024 or wider (tablet landscape) gets the stacked desktop and relies on hover-free plate numerals.
10. **The index-scale title preset degenerates to its bounds** (18 / 20px). That is honest, but it may mean the method adds little at this scale.

## 18. Maturity recommendation

**Remain PENDING RESPONSIVE VALIDATION.** Not forced.

What passes:

- identification without hover (100% at every width and count)
- titles in one face with Vietnamese (0 fallback glyphs)
- one moving preview (≤ 1 always)
- reduced motion
- order
- touch targets
- no overflow
- phone density (a single-column contact sheet)

What still needs Owner decisions:

1. **540–699 density (§9):** either accept one-up 2:1 frames at 304–394px, or authorise an Art Works-specific mid-width presentation. The second is the same class of decision as Project Detail's structured grid. It was not invented here.
2. **Desktop at 3 and 18 projects (§2):** accept verbatim packing as the new desktop state, or keep a page-specific count-dependent target, which would be a page parameter the shared candidate does not have.

If both are ruled on, Art Works can move to **RESPONSIVE VALIDATED — candidate**. Even then it is **not Design Approved, not production-ready, not implementation complete**.

## 19. Files

**Created:**

- `docs/design/prototypes/art-works/Art Works 2C v2 Responsive.dc.html`
- `docs/design/prototypes/art-works/art-works-2c-v2-responsive.md`

**Modified:** none. Not staged, not committed, not packaged.
