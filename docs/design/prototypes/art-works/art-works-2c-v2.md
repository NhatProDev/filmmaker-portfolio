# Art Works — 2C v2 review

- **Date:** 2026-09-22
- **Status:** Candidate baseline under refinement. **Not approved. No design document updated.**
- **Prototype:** `Art Works 2C v2.dc.html`
- **Retained as record:** `Art Works Directions.dc.html` (2a, 2b, 2c v1), `art-works-directions.md`
- **Authority:** `design-direction.md`, `design-system.md`, `page-specifications.md` §2, ADR-0003, ADR-0007, ADR-0008, ADR-0010, reference 3

## 0. Locked candidate decisions

Accepted by the Project Owner on 2026-09-22 and locked **for the prototype
record**. This is not design-document approval: `design-system.md` and
`page-specifications.md` remain Draft, and nothing here is promoted into them.

**Identification**

1. The **plate numeral stays on every project frame**.
2. The numeral is a **small identification mark, not a caption**.
3. **Project title and year live in the typographic index**, not on the media.
4. **Hover and keyboard focus use the same pairing routine** — one code path,
   no separate keyboard treatment.

**Preview playback**

5. Art Works runs **at most one `AUTOPLAY_VISIBLE` moving preview at a time**.
6. The active preview is the **eligible frame nearest the viewport centre**.
7. This is an **Art Works presentation/scheduling policy**, not a redefinition
   of `AUTOPLAY_VISIBLE` globally. ADR-0008's mode semantics are unchanged, and
   the §4 proposal below is therefore **withdrawn as a global rule** and
   retained as a page-level policy.

**Order**

8. Project semantic order **is `displayPosition`**.
9. Justified packing **may change row breaks, never project order**.

**Transition**

10. The **transition origin is the clicked media frame**.
11. The flown frame is **not required to carry the project title**.
12. The **numeral may disappear as the transition begins** — implemented: it
    fades on click of either surface.
13. The **destination Project Detail HERO owns project-title presentation**
    (ADR-0010).

**Responsive**

14. **Mobile remains pending validation.**

### What these locks resolve

Two questions this review left open are now answered: the transition payload
(decisions 11–13 — the frame carries no title, the numeral leaves, the HERO
owns the name) and the scope of the one-preview rule (decision 7 — page policy,
not a contract change). The plate numeral is settled by decision 1.

Still open: **mobile**, and whether the numeral's source should be a stable
catalogue number rather than `displayPosition` (§7 item 2).

---

## Core idea

**A typographic project index above a dense visual sheet.** The index names the
work; the sheet shows it; the two point at each other.

The refinement's one substantive addition is what makes that true **at rest**:
a **plate numeral** burned into each frame's lower-left, matching the index
numeral. Hover and focus are enrichment, not the mechanism.

## 1. Index ↔ media relationship

| Input | Index row | Sheet frame |
|---|---|---|
| **At rest** | numeral · title · year | matching plate numeral, nothing else |
| **Hover a row** | row marks accent + dot; other rows drop to 34% | its frame holds full strength with title/year caption; others drop to 34% |
| **Hover a frame** | its row marks accent + dot | frame holds; others drop |
| **Keyboard focus** (either) | identical to hover, plus a visible focus ring | identical to hover, plus a 2px light ring inside the frame |
| **Click** (either) | — | the **frame** is marked as transition origin |

Both directions and both input modes run through **one pairing routine**, so
hover and keyboard cannot drift apart. Verified: focusing index row 3 produced
frame outline, caption at opacity 1, siblings at 0.34 and the row dot lit —
identical to the hover result, in both directions.

**The plate numeral is the decision to review.** It is the only permanent mark
on the media, and it is what keeps identification available without an approach
state — which is what the brief asks for and what touch will need. It is not a
caption: no title, no year, no box, one glyph pair, with a small derived corner
gradient for contrast over unknown footage. `numerals: off` is built so the
alternative can be judged; with it off, the page reverts to hover-only
identification.

## 2. Project transition

The **media frame is the transition origin in both cases**. Clicking an index
row does not hand off from the row — it resolves to that project's frame and
marks that as the origin. The readout reports it (`last open #5 via index →
transition origin: frame`).

**No second transition system is defined here.** The prototype records the
origin and stops. That deliberately leaves the frame in the state ADR-0010
expects — a project-owned frame that can fly into a `CLICK_TO_PLAY` HERO
carrying the project's name.

**Settled by §0 decisions 11–13.** The flown frame is not required to carry the
title. The numeral fades as the handoff begins, so the frame travels as pure
media, and the destination HERO presents the project title (ADR-0010). Art Works
therefore needs no title-bearing frame state, and the caption state is browsing
chrome only.

## 3. Media field and project counts

Real `JUSTIFIED_ROWS` flow, native aspect throughout, 4px gutters, no card
chrome. Target row height follows the count: 420px at ≤4 projects, 300px at
9, 250px at ≥16 — fewer, larger frames when there is less work to show.

| Count | Index | Sheet | Reading |
|---|---|---|---|
| **3** | 1 column, cols 1–6 | 2 + 1, last frame half-width at 420px tall | Deliberate. A short list and three large frames |
| **9** | 2 columns | 3 / 3 / 3, all flush, 246–321px | The intended density |
| **18** | 3 columns | 5 rows of 3–4, all flush, 188–246px | A real catalogue; index becomes a table of contents |

**Orphan tails are absorbed.** At 18 the last frame was originally alone at
161px wide — which reads as a loading error, not a rest. If a ragged tail would
occupy under 40% of the width it is merged into the row above and that row is
re-solved. Cells stay contiguous and in order; only the row break moves. At 3
projects the tail is 52% wide and is deliberately left ragged.

## 4. Moving previews — decision

**A restrained number, enforced as exactly one.** Among eligible frames, the one
nearest the viewport's vertical centre plays; every other frame holds its
poster, and sources are released when a frame stops being the active one.
Verified: 6 eligible previews, **1 playing, 1 source loaded**.

This is the only way a dense sheet can honour the one-moving-field guidance —
a per-cell `AUTOPLAY_VISIBLE` rule puts four or five clips on screen at once, as
2c v1 showed. Reduced motion stops everything and releases every source (0
playing, 0 loaded, no active cell).

**Scope — settled by §0 decision 7.** This is an **Art Works scheduling
policy**: the page chooses which single eligible surface is playing at any
moment. It does **not** redefine `AUTOPLAY_VISIBLE`, and ADR-0008's mode
semantics are untouched. An earlier draft of this section proposed the rule as
a global redefinition; that proposal is withdrawn.

## 5. Ordering semantics

**Semantic order is `displayPosition`, and nothing else touches it.**

- The project array is built in `displayPosition` order and never re-sorted.
- Index DOM order = `displayPosition`.
- Sheet DOM order = `displayPosition`.
- The packer consumes items **in order** and only decides where rows break.
  It never swaps items to make a row fit, and the orphan merge moves a row
  boundary, not an item.

The review readout audits this live and fails loudly if it ever stops being
true: `index order 1…9 ✓ displayPosition · sheet order 1…9 ✓ displayPosition ·
row packing [1 2 3] [4 5 6] [7 8 9] (geometry only)`.

## 6. Responsive risks (identified, not solved)

1. **Index collapse.** Columns already follow count (1 / 2 / 3); at tablet and
   mobile this must fall to one column, and an 18-project list then pushes the
   sheet far below the fold. Whether the index stays above, becomes a
   collapsible summary, or moves beside the sheet is undesigned.
2. **Identification without hover.** The plate numeral is the answer, and it is
   why it exists — but it requires the index to be reachable while looking at
   the sheet, which one-column stacking breaks. This is the decision that will
   force itself first.
3. **Narrow-width `JUSTIFIED_ROWS`.** Below ~640px a row of 2.0-aspect covers
   becomes a 180px-tall strip. Needs the per-breakpoint items-per-row bound
   already recorded in `home-baseline-v2.md` §8.6.
4. **Count × density.** 18 projects at 250px target on mobile is a very long
   page; pagination or lazy extension is unresolved (§2.7).

## 7. Composer / data boundary

**No blocks were added.** Art Works remains one data-driven view: a list
rendering and a gallery rendering of the same ordered collection (ADR-0007). The
page has no composed regions and no per-project layout authoring.

**Data/model questions raised — not invented into the model:**

1. **Which projects have a moving preview.** Currently derived from "does a clip
   exist". Should be an explicit per-project choice, and that is a data field
   this contract does not have.
2. **The plate numeral's source.** Rendered from `displayPosition`, so it
   renumbers when projects are reordered and is not a stable identifier. If
   numerals should be stable (a catalogue number), that is a project field.
3. **Cover aspect is load-bearing.** `JUSTIFIED_ROWS` needs cover dimensions
   before layout, or the first paint reflows. Ingestion must supply them.
4. **What the flown frame carries** — numeral or title (see §2).

## 8. Borrowed from 2A

Taken: **tighter sheet density** (packing target now data-dependent rather than
fixed), **no persistent captions** — the plate numeral replaces them at a
fraction of the weight — and **quieter top spacing**: the masthead is one
display line and a right-aligned count, 78px above the index.

Not taken: 2A's anonymity. The index is the idea here, and the numeral exists
precisely so the sheet can stay quiet without becoming anonymous.

## 9. Fixed during refinement

1. Previews were loading but not looping — a renderer-written boolean attribute
   is not a reliable carrier; `loop`, `muted` and `playsInline` are now set as
   properties. Same class as the `playsInline` finding in `home-baseline-v2.md`
   §8.1.
2. A watchdog re-drives the single active preview, since an occluded or
   throttled frame can be paused by the environment with no observable event.
3. Passes are isolated — layout, plates, wiring, playback and readout each fail
   independently.
4. **Asset correction (Project Owner, 2026-09-22).** Project 9 "Sitting"
   referenced `media/w/about-portrait.png`, which does not exist in the runtime
   media set — a broken reference. It now uses the existing runtime asset
   `media/w/portrait.jpg` (970 × 1505, aspect 0.645, from 0.647). Cover only:
   no change to layout, ordering, aspect handling, interaction, numerals or
   preview policy. Re-verified: **15 / 15 media references resolve**, all three
   counts render (3 / 9 / 18, zero broken images), and Project 9 renders at
   206 × 321 with plate `09` paired to index row `09 Sitting 2023`.

## 10. Readiness

**2C remains the Art Works candidate baseline.** The index↔sheet relation now
works at rest, on hover and on keyboard alike; order semantics are guaranteed
and audited; the sheet is intentional at 3, 9 and 18.

Of the four items that previously blocked specification, three are resolved by
the §0 locks: the plate numeral (kept), the transition payload (frame carries no
title; HERO owns it), and the scope of the one-preview rule (page policy, no ADR
required).

**Remaining before Art Works can be specified:** mobile validation, and the
data/model questions in §7 — chiefly whether a moving preview is an explicit
per-project choice and whether the numeral should be a stable catalogue number
rather than `displayPosition`.
