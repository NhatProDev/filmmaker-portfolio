# JUSTIFIED_ROWS — narrow-width responsive behaviour

- **Date:** 2026-09-22
- **Status:** System validation. **Nothing approved. No page candidate, design document, spec or ADR modified.**
- **Prototype:** `Justified Rows Narrow Width.dc.html` (this directory)
- **Scope:** the shared GALLERY presentation mode used or expected by Home, Art Works and Project Detail

Three packing algorithms run the same ordered sequence at the same width, so
every difference is attributable to the algorithm. Real files with measured
aspects; extreme aspects (2.39, 0.50) are exercised with **labelled geometry
probes** — ruled boxes, never invented imagery, because the library holds
nothing wider than 2.041.

## 1. Failure of the current desktop-oriented behaviour

**Algorithm A** — fixed 300px target, greedy fill, orphan merge — is what the
page candidates ship today. It produces a **starved cell at every tested
width**, not only narrow ones:

| Width | A: narrowest cell in a justified row |
|---|---|
| 1440 | **102px** |
| 1024 | **103px** |
| 768 | **89px** |
| 430 | **85px** |
| 390 | **77px** |
| 375 | **99px** |

A 77px cell in a 390px row is the sliver the earlier evidence described. The
cause is structural: with a fixed target height, a row's cells divide the
measure in proportion to their aspects, so a portrait beside two wide items
always takes the remainder — and nothing in the algorithm objects.

## 2. Algorithms tested

- **A · desktop as-is** — fixed 300px target, orphan merge.
- **B · proportional target** — target height derived from width and the
  sequence's average aspect. Fixes row scale, **does not fix starvation**
  (still 95–134px cells) and produces 11–33% orphan tails.
- **C · target + cell floor + height ceiling** — B, plus a minimum cell width
  enforced both predictively and on the solved geometry, plus a bound on cell
  height.

## 3. Selected behaviour — C

```text
T      = W >= 1024 ? 3 : W >= 700 ? 2 : 1            // intended items per row
target = (W - gap × (T-1)) / (T × avgAspect)          // derived, not authored
floor  = max(120px, 0.10 × W)                         // minimum cell width
ceil   = 1.25 × W                                     // maximum cell height
gap    = 4px
```

Pack greedily **in order**. Close a row when the solved height reaches the
target, or before adding an item that would push any cell below the floor.
After solving, re-check every multi-item row and move a trailing cell down if
the floor is still violated. Single-item rows are exempt — a lone item cannot
starve.

**No item-per-row cap is needed.** The floor produces the right counts
implicitly, and it adapts to content: two landscapes pair happily at 375, a
portrait beside them does not. A fixed cap would have been a number chosen for
convenience; this is the same rule expressing itself differently per sequence.

## 4. Row-height rule

Target height is **derived from an intended items-per-row and the sequence's
own average aspect** — not clamped to width, not switched at breakpoints, not
authored per page. One authored intent ("about three across at desktop")
produces the height at every width.

Measured with 9 mixed items: 321/284/335px at 1440 · 228/201/237 at 1024 ·
284/183/287/202/249 at 768 · one-up below 700.

## 5. Item-per-row bounds

None imposed. `T` sets an *intention*, not a limit — the floor decides the
outcome. Observed: 3 across at 1024–1440, 2 at 768, **one-up below 700**.

Below 700 the mode effectively becomes a single column of native-aspect items.
That is the honest consequence of preserving aspect without cropping at phone
widths, and it matches what the medium already does.

## 6. Portrait and extreme-aspect handling

Two bounds, no cropping:

- **The floor** stops a portrait from being squeezed by wide neighbours. It
  moves to its own row instead.
- **The ceiling** (`1.25 × W`) stops a tall item from becoming a monolith. At
  375 the 0.50 probe would be 750px tall at full measure; it is capped at 469px
  and rendered **ragged at 235px wide** — still native aspect, still uncropped,
  simply not filling the row.

The 2.39 probe needs no special handling at any width.

## 7. Orphan tail

A lone tail item is merged into the previous row **only if the merge starves
nobody**. Otherwise the tail stays ragged at target height — which is what
honest native-aspect packing looks like when the remainder cannot fill a row
without cropping.

The distinction that matters, and which the first version of this audit got
wrong: **a starved cell inside a justified row is a defect; a ragged tail is
not.** A tail is only a fragment if its own cell falls below the floor. At 768
the 0.50 probe ends alone at 125px — above the 120px floor, so it stands.

## 8. Behaviour at the tested widths (C, 9 mixed items)

| Width | Rows | Narrowest cell | Tail |
|---|---|---|---|
| 1440 | 3/3/3 | 168px ✓ | justified |
| 1024 | 3/3/3 | 119px ✓ | justified |
| 768 | 2/2/2/2/1 | 183px ✓ | ragged, 125px ✓ |
| 430 | one-up | 430px ✓ | ragged, 140px ✓ |
| 390 | one-up | 390px ✓ | ragged, 127px ✓ |
| 375 | one-up | 375px ✓ | ragged, 122px ✓ |

**No starved cells at any width.** A shows one at all six.

## 9. Behaviour at 3 / 4 / 6 / 9 / 18 items

At 375: one-up throughout, 3 → 3 rows, 18 → 18 rows. At 1440: 3 → a single row
of three; 18 → 6 rows of three at 321/284/335/246/246/231px. The visual
language does not change with count — only the number of rows does, which is
the point of the mode.

## 10. Order preservation

Verified at every width and count: the rendered sequence reads `1 2 3 … n` and
the audit reports `✓ source order`. The packer consumes items in order; the
floor enforcement and the orphan merge **move row boundaries only** and never
swap, promote or defer an item.

Position numerals are drawn on every cell so order is auditable by eye, not
only by assertion.

## 11. Native aspect

Verified at every width and count: every cell's rendered `w/h` is within 2% of
its source ratio. Nothing is cropped to make a row fit; `object-fit: cover`
inside a cell is only ever operating on a box that already matches the
source aspect.

## 12. Readiness

**The rule is strong enough to become the shared JUSTIFIED_ROWS responsive
candidate.** One expression, four parameters, no per-page values, no mobile-only
mode, and it fixes a defect that was present at desktop too — the narrow-width
brief surfaced a bug the desktop candidates already had.

## 13. Remaining uncertainty

1. **No true cinematic asset.** 2.39 and 0.50 were exercised as geometry
   probes. The rule is aspect-driven so it should hold, but a real 2.39 master
   should be run through it before this is specified.
2. **`avgAspect` is sequence-wide.** A library that is 90% portrait would pull
   the target height up for everyone. Untested — the current set is
   landscape-dominant.
3. **The 700px boundary** between two-up and one-up is asserted from this
   sequence at 768 and 430. The interval 431–699 was not itself tested.
4. **`0.10 × W` and `120px`** come from the observed failures (77–103px cells
   read as slivers; 119–168px did not). They are defensible, not derived from
   first principles.
5. **Interaction with `AUTOPLAY_VISIBLE`** is untested here — this prototype is
   still imagery. Art Works' one-preview-at-a-time policy will meet one-up rows
   at mobile and should be checked together.
6. **Page adoption is not validated.** Home, Art Works and Project Detail each
   use `JUSTIFIED_ROWS` in a different context; this rule needs to be run
   through those three pages before any of them changes.
