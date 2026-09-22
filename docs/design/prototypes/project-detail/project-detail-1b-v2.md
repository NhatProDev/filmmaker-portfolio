# Project Detail — 1B v2 review

- **Date:** 2026-09-22
- **Status:** Candidate baseline under refinement. **Not approved. No design document updated.**
- **Prototype:** `Project Detail 1B v2.dc.html`
- **Supersedes for review purposes:** option 1b in `Project Detail Directions.dc.html` (1a and 1c retained as record)
- **Authority:** `design-direction.md`, `design-system.md`, `page-specifications.md`, ADR-0006, ADR-0008, ADR-0009, reference 4

## Defining idea

**The project opens directly into the film.** No title-card preamble. The hero
carries the film and the film's name; everything that has to be *read* sits
below it.

## 1. Hero composition

| Element | Decision | Why |
|---|---|---|
| Title | Marcellus caps, 88px, bottom-left, **on the same 12 columns as the page** (cols 1–8) | Grid-aligned, not floated. It is the name of the thing you are looking at, not a heading about it. |
| Year / runtime | **Removed from the hero.** Now the first item of the metadata list below | They are read, not seen. Keeping them over footage was the v1 error. |
| Back to works | Top-left, `font-ui` tracked caps, hairline underline | A line of type, not a control. The underline carries it, not colour (§12). |
| Play affordance | 78px circle, centred, static | Reference 4's plain circular affordance. No hover motion — §10.1. |
| Scrim | Bottom 210px + top 120px gradient, **functional only** | Needed for AA over unknown footage. Each scrim belongs to the text it serves: the bottom one follows the title (gone in stacked mode, gone once the film starts), the top one belongs to *Back to works* and stays in both modes. |
| On play | Overlay, affordance and the title's scrim leave; *Back to works* and its scrim stay; real controls appear, audio available | Nothing decorative sits over a running film, but the way out stays reachable. |

### How much text may sit over footage

The working rule this composition proposes: **the overlay may carry the
project's name and one navigation line — nothing that has a reading measure.**
The test is whether a visitor who reads none of it still understands the page.
Year, runtime, client, role, statement and credits all fail that test, so all of
them are below the fold. v1 failed it too (a runtime string in the overlay).

## 2. Composer legality — the title overlap

**Both options are built.** Switch `titleMode` in the tweaks.

**A — HERO with bounded overlay content** (built, default). The title sits
inside the hero frame, placed on the same 12-column grid, anchored bottom-left.
This is *configuration*, not free positioning: an anchor from a closed set, a
column placement, and one text role.

**B — TEXT block immediately after the HERO** (built, `titleMode: stacked`).
Legal today with no contract change. The film then owns the first viewport
completely and the title appears as you scroll.

**Assessment.** B is architecturally free and visually honest, but it loses the
defining idea's second half: the frame that flew in from Home no longer carries
the name, so the transition lands on an anonymous rectangle and the title
arrives as a separate event. A keeps the handoff intact.

**A is not expressible in the current contract.** CLAUDE.md §13 lists HERO as a
canonical block with no overlay-content concept, and ADR-0006's placement
vocabulary positions blocks *in a grid*, not *within another block's frame*.

**[ARCHITECTURE QUESTION — raised, not applied]** Should HERO gain a bounded
overlay-content capability?

```text
Problem:      The project's name belongs inside the opening frame, and the
              light→dark transition hands off a frame that should already
              carry it.
Proposed:     HERO.config gains optional overlay: { anchor: closed enum
              (bottom-left | bottom-right | top-left), colStart, colSpan,
              title: text, scrim: derived-not-authored }. No new block type,
              no free positioning, no z-index editing, one text role.
Why bounded:  Anything more becomes a layer editor, which §13 puts out of scope.
Alternative:  Option B, shipped today, at the cost of the transition.
```

Do not treat the prototype's default as the decision.

## 3. Page rhythm

```text
HERO film ──band── metadata + statement ──band── justified stills
   ──band── one supporting loop + caption ──band── credits
   ──band── full-bleed still ──── next project
```

Reading and looking alternate. **No two moving fields share a viewport**: the
hero is click-to-play (still until asked), and the only autoplaying surface on
the page is one 16:9 loop with a text column beside it. `--band` at 150px
carries every seam.

## 4. Supporting media — what each surface is, and what it is not

| Surface | Type | Decision |
|---|---|---|
| Stills after the statement | **GALLERY `JUSTIFIED_ROWS`** | Native aspect, shared row height, 4px gutters, full bleed |
| Supporting loop | **VIDEO in a GRID**, `AUTOPLAY_VISIBLE`, cols 1–8, caption cols 10–12 | One loop, deliberately placed |
| Coda | **IMAGE**, full bleed | A rest, not a summary |
| Credits | **TEXT in a GRID**, cols 1–3 | Quiet, against the void. Not a panel |
| — | **`VIDEO_GRID` — deliberately not used** | A project's supporting material is heterogeneous; a uniform 16:9 wall would flatten it. It stays available as configuration for a project that genuinely has many short clips |

**Fixed from v1:** the 2×3 square thumbnail cluster is gone. Uniform square
tiles crop native aspect, and `design-system.md` §7.2 admits exactly two uniform
surfaces — `VIDEO_GRID` and `HORIZONTAL_STRIP`. The cluster was neither, so it
was an A6 violation dressed as a reference quote. `JUSTIFIED_ROWS` gives the
same contact-sheet reading legally.

## 5. Reorderability

| Block | Remove | Reorder | Fewer assets |
|---|---|---|---|
| HERO film | Page opens on the statement. Reads as an essay about a project — acceptable, not ideal | Works anywhere; the name goes with it | — |
| Metadata + statement | Film goes straight to stills. Fine | Works anywhere | Metadata list is row-by-row; three rows or six both read |
| Justified stills | Nothing depends on it | Works anywhere | Below ~3 stills the row gets tall; **at one still it is an IMAGE, not a gallery** |
| Supporting loop + caption | Nothing depends on it | Works anywhere | Caption is optional; the video holds cols 1–8 alone |
| Credits | Nothing depends on it | Works anywhere | Any number of rows |
| Coda still | Nothing depends on it | Works anywhere | — |

No block reads as a continuation of its neighbour. The only ordering the design
*prefers* — film first — is the page's idea, not a dependency, and an admin who
moves it gets a different but coherent page.

## 6. Responsive risks (identified, not solved)

1. **The overlaid title is the main risk.** At 88px over a 780px hero it is
   comfortable; at mobile the same title over a ~55vh hero covers most of the
   frame. Likely answer: the overlay's column span and scale follow the hero's
   container, and below some width the title falls back to option B's stacked
   position automatically. That fallback would need to be part of whatever
   overlay capability is approved.
2. **Metadata before statement at mobile.** DOM order is `position`, so the
   ruled list stacks above the statement. Defensible, but the statement is the
   better opener — a candidate for an explicit mobile `position` override.
3. **Justified rows** need the per-row solve already built for Home v2 (§8.6 of
   `home-baseline-v2.md`); four stills in one row will not survive 375px.
4. **Supporting loop + caption** stacks safely; the caption may want a width
   mode so it does not run the full 375px.
5. **Scrim height** is tuned to a 780px hero and will be proportionally heavier
   on a short mobile hero.

## 7. What was borrowed from 1A

Taken: the **ruled label/value metadata list**, the **credits as a narrow column
against a void**, and **larger band pauses**. These are system patterns, not 1A's
idea.

Not taken: the title-card opening, which is 1A's whole thesis.

## 8. Changed from 1B v1

1. Year/runtime left the hero — they were a middle-dot meta string, which §13
   forbids outright.
2. The 2×3 uniform thumbnail cluster became `JUSTIFIED_ROWS` (A6).
3. `VIDEO_GRID` removed; one deliberate supporting loop in its place.
4. Title placed on the 12-column grid rather than floated, and the stacked
   alternative built alongside it.
5. Overlay, affordance and the title's scrim now clear themselves when the film
   starts, and cannot come back on a re-render: hero chrome is computed in one
   place from two inputs — title mode **and** whether the visitor has started
   the film.
6. Credits moved from a four-row block near the middle to a quiet column
   against a void, after the supporting media.
7. Bands widened to 150px; the page has fewer, larger pauses.

## 9. Carried, unresolved

- **Poster/film fit mismatch.** The poster is `COVER`, the film plays `CONTAIN`,
  so pressing play reframes. Same geometry problem as `home-baseline-v2.md` §8.3,
  arriving here from §7.3's own CONTAIN-for-primary-film guidance. Proposed
  reading, not applied: a CLICK_TO_PLAY poster should inherit the film's `fit`.
- **Letterbox** on `c1` is visible inside the contained frame. Untreated on
  purpose (§13).
- **Transition landing** — the flown frame becomes this hero; whether the title
  is already in the flown frame depends on the architecture question in §2.

## 10. Readiness

**1B remains the Project Detail candidate baseline.** The defining idea survived
refinement and got stronger by losing text from the hero. It is blocked from
specification by one architecture question (hero overlay content), one carried
media question (poster fit), and mobile, which has been identified and not
designed.
