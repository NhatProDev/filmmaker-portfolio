# About Me — 3B v2 review

- **Date:** 2026-09-22
- **Status:** Candidate baseline under refinement. **Not approved. No design document updated.**
- **Prototype:** `About Me 3B v2.dc.html`
- **Retained as record:** `About Me Directions.dc.html` (3A, 3B v1, 3C), `about-me-directions.md`
- **Authority:** `design-direction.md`, `design-system.md`, `page-specifications.md`, ADR-0007, references A and B

**Core idea, locked:** About Me is a **filmmaker profile feature**. Writing
leads, the portrait establishes identity, process imagery is evidence,
experience is editorial metadata. The page stays content-managed.

## 0. Locked candidate decisions

Accepted by the Project Owner on 2026-09-22 and locked **for the prototype
record**. This is not design-document approval: `design-direction.md`,
`design-system.md` and `page-specifications.md` remain Draft, no ADR is touched,
and nothing here is promoted.

**Direction**

1. About Me uses **Direction 3B v2 — Editorial / Process**.
2. **About remains content/file-managed in V1** (ADR-0007).
3. **No composer architecture is required**, and none is requested.

**Composition**

4. **Biography writing leads the page.**
5. **The portrait establishes identity**, and is not the page's subject.
6. **Process imagery is evidence, not a portfolio gallery** — each frame answers
   a line of writing.
7. **Selected Experience is restrained editorial metadata**, not a CV.
8. The **shared datum / partial-rule structure is part of the candidate
   composition** — the bounding device is rules, never a container.
9. **Desktop vertical rhythm is accepted** as built.

**Asset**

10. **The portrait remains immutable at native aspect** — 970 × 1505 (0.6445),
    no crop, zoom, reframe, transform or `object-fit: cover`. Enforced by the
    prototype's live audit.

**Open, and explicitly not blocking**

11. The **missing on-set operating frame is a publication-asset gap, not a
    design blocker** — the placeholder slot is the accepted interim state.
12. **Real biography copy remains provisional.**
13. **Mobile and tablet behaviour remains pending visual validation.**

### Exploration evidence, unchanged

3A, 3B v1 and 3C remain exactly as explored in
`About Me Directions.dc.html` / `about-me-directions.md`. They are not
maintained forward and are not affected by these locks.

---

## 1. What changed from 3B v1

1. **The rectangle is gone.** The biography is bounded by a **shared datum rule**
   across all twelve columns above it and a **partial closing rule** at 46% of
   the column below it. Structure without a container.
2. **The portrait hangs from the same datum** as the text rather than floating
   beside it, offset 58px below it — still refusing alignment, but from a shared
   structure rather than from nothing.
3. **The first evidence image moved into the opening section**, below the
   biography in the same left column. The two columns now end 160px apart
   instead of leaving a ~450px void under the text.
4. **One left reading spine.** Text always begins at column 1 and images answer
   from the opposite side, so identity → biography → evidence → experience reads
   as one descending sequence (borrowed from 3C; none of its layout was).
5. **The placeholder is quieter** — two hairlines and one line of muted type
   instead of a hatched, bordered box. Quiet, but held at `--muted` (4.75:1):
   the slot's job is to record a missing asset honestly, so it must stay
   readable. A lighter grey was tried first and measured 2.24:1 — quiet to the
   point of invisible, which defeats the purpose.
6. **Media reduced from 4 to 3 images**, spacing widened, band tightened from
   140 to 112 so the page is looser in image count and tighter in dead vertical
   run.
7. **Experience trimmed to four entries** and narrowed to cols 4–10.
8. A closing contact line replaces the page simply stopping.

## 2. Opening composition — rationale

The v1 problem was not the amount of space but that **nothing tied the two
columns together**, so the space read as a gap rather than as a pause. Three
devices fix it without adding density:

- **A shared datum.** One rule spans the full measure; both the text and the
  portrait hang from it. Non-alignment now reads as a deliberate offset from a
  common line.
- **A tail that nearly meets.** The left column runs 160px past the portrait —
  enough to stay asymmetric, close enough that the eye reads one composition.
  Measured live in the review readout.
- **Evidence inside the opening.** The first process image sits under the
  biography, so the first viewport contains identity, writing and one piece of
  evidence — the page's whole argument in miniature.

The portrait was **not** enlarged to fill space; it occupies the same four
columns as before.

## 3. Biography hierarchy

```text
ABOUT ME          12px tracked caps, muted        — editorial marker
opening statement 24px / 1.38, 30ch               — the voice
primary biography 17px / 1.78, 54ch               — the work
background        17px / 1.78, 54ch, muted        — the history
— partial rule —
```

Four levels, one heading, no subheads. Copy remains provisional.

## 4. Portrait treatment

`media/w/portrait.jpg`, native 970 × 1505 (0.6445). `width:100%; height:auto`,
no `aspect-ratio`, no `object-fit`, no `object-position`, no transform. Rendered
429 × 666 at 1440 — aspect 0.6445, verified by the prototype's audit, which
prints `✗ ALTERED` if rendered aspect ever diverges or `cover` appears.

## 5. Process / BTS strategy

Three real images, each with a stated reason:

| Image | Reason | Caption |
|---|---|---|
| `portrait.jpg` | identity | Hanoi, 2025 |
| `desk-01.jpg` | working method — the grade | Grading at home, second pass |
| `mtm-atelier.jpg` | environment — a room before lighting | The tailor's workroom, before the lights went in |

Each image is answered by a short line of writing on the opposite side, so the
imagery reads as evidence *for the text* rather than as a gallery. Nothing was
substituted; captions describe what the frames actually are.

**Density vs Art Works:** 3 images across a 2,482px page, versus 9–18 frames in
a packed sheet. About is deliberately the sparser surface.

## 6. Selected experience

Four entries, ruled rows, year in a 5ch column, role and production in body
type. Label set as italic muted text at cols 1–2 rather than a heading. No
timeline, no cards, no badges, no icons. It is metadata at the foot of a
feature, not a CV.

## 7. Missing publication assets

1. **On set — operating.** ~3:2, the filmmaker working with the camera. This is
   the placeholder in the prototype, and the only one. **Replacement:** a real
   BTS frame from any shoot, landscape, showing hands and camera in the room
   rather than a posed portrait.
2. **A second portrait.** The opening portrait is also 3A's and 3C's; if About
   ships alongside those explorations nothing changes, but the page would be
   stronger with a working portrait distinct from the seated one.
3. **Process frames are shared with Art Works.** `desk-01` and `mtm-atelier`
   appear there as project covers. Acceptable for judging composition; for
   publication About should own its own process frames.

## 8. Responsive risks (recorded, not designed)

1. **Stacking order.** DOM order puts the biography before the portrait, so
   mobile leads with text. Defensible for a writing-led page, but the portrait
   arriving after three paragraphs delays identity.
2. **Loss of deliberate non-alignment.** The 58px offset and the 160px tail are
   the composition; stacked, both vanish and the page becomes a plain column.
3. **The datum rule** spans twelve columns; at mobile it is a full-width line
   above a single column, which may read as a divider rather than a datum.
4. **BTS ordering.** Each image currently pairs with a line of text across the
   grid; stacked, the pairing becomes image-then-text and the "answer"
   relationship weakens.
5. **Framed → unframed.** Already partly answered: there is no frame to lose,
   only rules. The partial closing rule at 46% may need a fixed measure.
6. **Experience compression.** Year and role in one row at 375px will wrap; the
   year likely becomes a line above rather than a column beside.

## 9. Architecture

**No new architecture is required.** The page is grid placement, rules, images
at native aspect and text — nothing that needs free-form positioning, composer
blocks, overlap or new schema. About remains content-managed in V1 (ADR-0007),
and unlike 3A this direction does **not** touch `design-system.md` §5.5's
deferred overlap primitive.

## 10. Readiness

**3B v2 is the accepted About Me candidate baseline** (§0). The refinement
fixed the real defect — a disconnected opening — with structure rather than
with more content, and the page now reads as one sequence.

**Remaining blockers, by kind — none of which are composition:**

*Publication assets*
- On-set operating frame (~3:2, hands and camera in the room). Placeholder slot
  in place; §0 decision 11 confirms this does not block the design.
- A second, working portrait distinct from the seated one.
- Process frames owned by About rather than shared with Art Works
  (`desk-01`, `mtm-atelier` currently appear in both).

*Copy / content*
- Real biography copy; all four text levels are provisional (§0 decision 12).
- Final Selected Experience entries and wording.
- Final captions, which currently describe the prototype's frames.

*Responsive / mobile*
- All six risks in §8 — stacking order, loss of the offset and tail, the datum
  rule at one column, image↔text pairing, the partial rule's measure, and
  experience-row compression (§0 decision 13).
