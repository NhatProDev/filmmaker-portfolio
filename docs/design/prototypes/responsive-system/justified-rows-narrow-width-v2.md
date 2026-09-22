## 0. Locked findings

Accepted by the Project Owner on 2026-09-22 as the **shared responsive
candidate** and locked **for the prototype record**. This accepts the behaviour
as system-level responsive candidate evidence — **not final design approval**.
No design document, spec, ADR or page candidate is modified.

**Rejected references**

1. **Sequence-wide `avgAspect` is rejected** — appending later media causes
   unacceptable global coupling.
2. **Median and trimmed sequence references are also rejected.**

**Selected**

3. **Fixed reference aspect 1.6** is the selected candidate.

**Stability**

4. **Completed rows above the current tail remain stable** when media is
   appended.
5. **Only the current tail may repack** as the dataset grows.
6. **Source order is invariant.**

**Media**

7. **Native media aspect is preserved.**
8. **Media is never cropped merely to satisfy row packing.**

**Bounds**

9. **No fixed item-per-row maximum is required.**
10. **The minimum-cell floor controls legibility.**
11. **The height ceiling bounds tall and extreme media.**

**Tails**

12. **Ragged tails are allowed.**
13. **A ragged tail is a defect only when its own cell is below the minimum
    floor.**
14. **Tail merging is allowed only when no cell becomes starved.**

### Candidate formula

```text
T      = W >= 1024 ? 3 :
         W >= 700  ? 2 :
                     1
ref    = 1.6
target = (W - gap × (T - 1)) / (T × ref)
floor  = max(120px, 0.10 × W)
ceil   = 1.25 × W
gap    = 4px
```

**These constants are empirical but supported across the tested range** —
5 datasets × 11 widths, zero starved cells.

### Preserved, deliberately not smoothed

The **480 → 450 transition**, where the last portrait pairings dissolve and
portraits begin standing at the ceiling. It is visible, bounded and
deterministic; it has not been artificially smoothed.

### Preserved uncertainty

- **1.6 remains an empirical system constant.**
- **2.39 and 0.50 are geometry probes**, not real masters.
- **Actual page compositions have not been validated with this rule.**
- **`AUTOPLAY_VISIBLE` interaction on one-up Art Works rows remains untested.**

### Comparison evidence, unchanged

`Justified Rows Narrow Width.dc.html` and `justified-rows-narrow-width.md`
(v1) are retained as the **rejected / comparison evidence** — algorithm A's
starved cells and the sequence-average behaviour this pass replaced.

### Runtime asset correction — 2026-09-22

Project Owner decision. v2's `aboutP` entry referenced
`media/w/about-portrait.png`, which is not present in the repository runtime
set and rendered as an empty media well.

- **Changed:** that one `src` to the existing `media/w/portrait.jpg`.
- **Not changed:** the declared aspect stays **0.647**, so the geometry under
  test is identical. Packing logic, `ref = 1.6`, floor, ceiling, `T`
  thresholds, datasets, ordering, probes, tables and every finding are
  untouched.
- **Consequence worth recording:** the declared 0.647 now differs from the
  file's true 0.645 by 0.3%. That is inside the audit's 2% tolerance and the
  cell still reports `✓` on native aspect, but the declared value is now a
  *test constant* rather than a measurement of the asset behind it. If this
  prototype is ever re-used to validate real content, that entry should be
  re-measured.
- **Verified after the change:** 14 distinct media references, **14 of 14
  resolve**, 0 broken images, and every computed table byte-identical —
  fixed-reference Δtarget still 0 at 1440 and 375, portrait-dominant still
  starved-free, the 450 transition row still `9 rows · 220,563,253,188,224,563,253,225,281 · 450px`,
  and **0 `✗` marks across all three tables**.

---

# JUSTIFIED_ROWS v2 — hardening pass

- **Date:** 2026-09-22
- **Status:** System validation. **Nothing approved. No page candidate, design document, spec or ADR modified.**
- **Prototype:** `Justified Rows Narrow Width v2.dc.html`
- **Retained unchanged as evidence:** `Justified Rows Narrow Width.dc.html`, `justified-rows-narrow-width.md`

Candidate C from v1 under attack on four fronts. All tables in the prototype
are **computed at run time** — 5 datasets × 11 widths × 4 reference strategies —
not read off screenshots.

## 1. Sequence-wide `avgAspect` — the coupling result

**It couples, badly, and a fixed reference removes the coupling entirely.**

Target height after appending later items, with the first nine unchanged:

| Reference | 1440 +6 portrait | 600 +6 portrait | 375 +6 wide |
|---|---|---|---|
| `avg` (v1) | 312 → **402** (+90) | 392 → **505** (+113) | 245 → **208** (−37) |
| `median` | 268 → **663** (+395) | 337 → **833** (+496) | 211 → **184** (−27) |
| `trimmed` 20% | 307 → **444** (+137) | 385 → **558** (+173) | 241 → **187** (−54) |
| **`fixed` 1.6** | **298 → 298 (0)** | **375 → 375 (0)** | **234 → 234 (0)** |

With `avg`, appending six portraits to a nine-item gallery raises the target by
**29%** and repacks content the visitor may already be looking at. `median` is
dramatically worse — a median is a step function over a small sample, so one
appended item can move it a whole aspect class. `trimmed` only softens it.

**Selected: a fixed reference aspect of 1.6.** Δtarget is exactly 0 in every
case, at every width.

### Residual movement, and why it is acceptable

With `fixed`, 1–3 of the first nine items still move by >5% after an append —
but the row-run audit shows **every complete row above the last one is byte-identical**
(`9/9`, `7/7`, `3/3` stable runs at 375, 600 and 1440 for the wide and 18-item
appends). The movement is confined to the final row, which was incomplete and
is precisely the row an append is supposed to finish.

That gives a statable property: **appending can repack the last row; it can
never touch a completed row above it.**

## 2. Append / growth stability

Tested as a real append (9 → 18 items), not as two unrelated datasets. With
`fixed`: Δtarget 0, stable runs **3/3 at 1440, 7/7 at 600, 9/9 at 375**. The
only change is that the previously-ragged tail becomes a full row.

## 3. Portrait-dominant dataset

Dataset D — 12 items, 8 in the 0.5–0.8 band, mixed with three landscape and one
2.39 probe. Across all 11 widths:

| Width | Rows | Narrowest | Tallest | Starved | Order | Aspect |
|---|---|---|---|---|---|---|
| 1440 | 3 | 159px | 388px | ✓ no | ✓ | ✓ |
| 1024 | 3 | 132px | 281px | ✓ no | ✓ | ✓ |
| 768 | 5 | 132px | 374px | ✓ no | ✓ | ✓ |
| 699 | 6 | 130px | 535px | ✓ no | ✓ | ✓ |
| 600 | 7 | 188px | 494px | ✓ no | ✓ | ✓ |
| 480 | 7 | 150px | 394px | ✓ no | ✓ | ✓ |
| 430 | 7 | 134px | 353px | ✓ no | ✓ | ✓ |
| 375 | 8 | 143px | 469px | ✓ no | ✓ | ✓ |

No starved cells, no repeated monoliths — the tallest cell never exceeds the
ceiling, and portraits pair with each other rather than each taking a row.
A portrait-dominant library is usable.

## 4. Intermediate widths 431–699

| Width | T | Rows | Tallest | Narrowest |
|---|---|---|---|---|
| 768 | 2 | 5 | — | 183px |
| 720 | 2 | 5 | — | 172px |
| 699 | 1 | 6 | — | 139px |
| 650 | 1 | 6 | — | 129px |
| 600 | 1 | 7 | — | 159px |
| 540 | 1 | 7 | — | 143px |
| 480 | 1 | 7 | — | 127px |
| **450** | 1 | **9** | **563px** | 450px |
| 431 | 1 | 9 | 539px | 431px |
| 375 | 1 | 9 | 469px | 375px |

**The `T` change at 700 is not the discontinuity.** Crossing it moves 5 rows to
6 and nothing else jumps — because `T` only sets the target, and the floor
keeps pairing items above it.

**The real step is between 480 and 450**, where the last portrait pairings
dissolve and portraits begin standing alone at the ceiling (563px = 1.25 × 450,
exactly the bound). It is visible, but it is bounded, deterministic, and caused
by the floor refusing a sub-120px cell — the rule working, not failing. Per the
brief, it has not been smoothed for appearance.

## 5. Constants

**Both survive.** `floor = max(120px, 0.10 × W)` and `ceil = 1.25 × W` produced
**zero starved cells across 5 datasets × 11 widths**, and the ceiling was the
active bound in exactly the cases it exists for (a lone portrait at ≤480).

They remain **empirical** — chosen because 77–103px cells read as slivers and
119–168px did not — but they are now supported across the full tested range
rather than one sequence.

## 6. Change from C

**One:** the reference aspect feeding the target is now a **fixed 1.6**, not the
sequence average. Everything else is unchanged — target concept, floor, ceiling,
order, native aspect, no crop, no manual placement, orphan merge only when the
merge starves no cell.

## 7. Final candidate formula

```text
T      = W >= 1024 ? 3 : W >= 700 ? 2 : 1      // intended items per row
ref    = 1.6                                    // fixed reference aspect
target = (W - gap × (T-1)) / (T × ref)
floor  = max(120px, 0.10 × W)
ceil   = 1.25 × W
gap    = 4px
```

Pack in source order. Close a row when the solved height reaches the target, or
before adding an item that would push any cell below the floor. Re-check solved
rows and move a trailing cell down while the floor is violated. Cap solved row
height at the ceiling (the row then renders ragged). Single-item rows are exempt
from the floor.

## 8. Row and orphan semantics

- **Justified row** — fills the measure exactly; every cell ≥ floor.
- **Ragged row** — does not fill; occurs only as the last row, or when the
  ceiling caps a tall item. Legitimate, not a defect.
- **Orphan merge** — a lone tail item merges into the previous row **only if
  the merge leaves every cell ≥ floor**; otherwise it stands ragged.
- **Fragment** — a tail cell below the floor. **Not observed** in any tested
  combination.

Deterministic: same items, same width, same output, every time. No admin
control is introduced or required.

## 9. Remaining uncertainty

1. **1.6 is a chosen constant.** It sits between the library's landscape
   cluster (1.78–2.04) and its portraits (0.65), and produces good geometry —
   but it is a judgement, and a very different library might want a different
   one. It should be a system constant, not a per-page value.
2. **No true 2.39 or 0.50 master exists.** Both were exercised as labelled
   geometry probes. The rule is aspect-driven, so this should hold, but a real
   cinematic master should be run before specification.
3. **The 480/450 step** is bounded and deterministic; whether it is *desirable*
   is a visual judgement the owner should make by eye.
4. **`AUTOPLAY_VISIBLE` interaction remains untested** — this prototype is
   still imagery. Art Works' one-preview-at-a-time policy meets one-up rows at
   mobile and the two should be validated together.
5. **Page adoption is not validated.** Home, Art Works and Project Detail each
   use the mode in a different context and must each be run through this rule
   before any of them changes.

## 10. Readiness

**Yes — the behaviour is now strong enough to become the shared JUSTIFIED_ROWS
responsive candidate**, against the stated criteria:

| Criterion | Result |
|---|---|
| No starved justified cell | ✓ 55 combinations |
| Native aspect preserved | ✓ every cell within 2% |
| Source order preserved | ✓ every combination |
| Narrow widths bounded | ✓ ceiling active and holding |
| Portrait-dominant usable | ✓ dataset D |
| 431–699 coherent | ✓ one bounded step at ~465 |
| Append does not reflow globally | ✓ Δtarget 0; completed rows untouched |
| Orphan handling deterministic | ✓ no fragments observed |
| No new admin control | ✓ none introduced |

The open items in §9 are validation and judgement, not defects.
