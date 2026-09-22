# Contact — 4B v2 review

- **Date:** 2026-09-22
- **Status:** Candidate baseline under refinement. **Not approved. No design document updated.**
- **Prototype:** `Contact 4B v2.dc.html`
- **Retained as record:** `Contact Directions.dc.html` (4A, 4B v1), `contact-directions.md`
- **Authority:** `design-direction.md`, `design-system.md`, `page-specifications.md`, ADR-0007, CLAUDE.md §19

**All contact values are prototype copy** — address, handles, availability
window, reply-time claim. Not publication data.

## 0. Locked candidate decisions

Accepted by the Project Owner on 2026-09-22 and locked **for the prototype
record**. This is not design-document approval: `design-direction.md`,
`design-system.md` and `page-specifications.md` remain Draft, no ADR is touched,
and nothing here is promoted.

**Direction**

1. Contact uses **Direction 4B v2 — Editorial Contact Sheet**.
2. **Contact remains static / content-managed in V1** (ADR-0007, CLAUDE.md §19).
3. **No form, booking, submission backend, message storage or new schema is
   required.**

**Action and information**

4. **Email is the primary action.**
5. **Email is visually separated from secondary metadata** — its own block, ink
   rule, display size and the page's single accent.
6. **Instagram, Vimeo, Based and Travel remain secondary metadata.**
7. **No CTA button is required** — the email itself is the call to action.

**Composition**

8. The **ruled-sheet structure is part of the candidate composition** — rules
   and alignment, never containers or cards.
9. The **shared datum rule aligns Contact with the About editorial language**,
   so the two read as one publication.

**Media**

10. The **identity still is optional and provisional.**
11. The page **must remain compositionally valid if the still is removed** —
    enforced by the `identityMedia` switch and verified pixel-identical.

**Open, and explicitly not blocking**

12. **All current contact values are prototype copy.**
13. **Reply-time wording is provisional** and must not be treated as a factual
    promise.
14. **Mobile and tablet behaviour remains pending visual validation.**

### Exploration evidence, unchanged

4A and 4B v1 remain exactly as explored in `Contact Directions.dc.html` /
`contact-directions.md`. They are not maintained forward and are unaffected by
these locks.

---

## 1. What changed from 4B v1

1. **Email left the list.** It is now a distinct primary block above the
   metadata rows, with its own tracked label, an **ink rule** above it (heavier
   than the `--rule` hairlines below), 38px Marcellus in accent, and a quiet
   reply-time line beneath.
2. **The remaining rows dropped to 16px** metadata, so the sheet has one
   primary line and four supporting ones instead of five equal rows.
3. **One left spine.** Heading, statement, email, rows and closing note all sit
   in cols 1–7, and the heading is **sized in `cqw` of the spine itself** rather
   than of the grid, so the word ends on the same edge as every rule beneath it
   (measured: glyphs end 1px inside the spine). v1 split the page into a left
   list and a right image, which is what made it read as two modules.
4. **The still became a margin element** at cols 9–13, hanging from the datum
   with an 86px offset — no longer a structural counterweight.
5. **A shared datum rule** across all twelve columns opens the page, the same
   device as About Me 3B v2, so the two pages read as the same publication.
6. **Travel row kept, nothing added.** Five fields total.
7. The closing note tightened to two sentences and moved onto the spine.

## 2. How email priority was improved

Four signals, none of which is size alone:

| Signal | Email | Other rows |
|---|---|---|
| Type size | 38px Marcellus | 16px Newsreader |
| Colour | accent | ink / muted |
| Rule above | 1px **ink** | 1px `--rule` hairline |
| Label | tracked caps, own line | italic muted, inline |

Measured ratio: **2.38× the metadata rows.** That is emphatic within a sheet,
and roughly a third of 4A's display treatment — the page still reads as a
contact sheet with a primary line, not as 4A pasted into 4B. Accent appears
exactly once in the page body.

## 3. Final information hierarchy

```text
— datum rule —
CONTACT                     21.3cqw of the spine · ends on the spine edge
availability statement      19px / 34ch
— ink rule —
EMAIL       hello@…         38px accent · mailto     ← primary action
            reply time      15px muted
— hairline rules —
Instagram   @…              16px
Vimeo       …               16px
Based       Hanoi · GMT+7   16px
Travel      Regional        16px
closing note                17px muted / 52ch
[identity still, margin]
footer
```

## 4. Image strategy — and the page without it
The still is **provisional identity media**: `mtm-shopfront.jpg`, borrowed from
Art Works, caption replaced with an honest "Provisional identity media — caption
to come" (v1's invented street caption is gone).

**The page does not depend on it.** Everything that carries meaning is on the
spine; the still occupies margin the composition does not need. Switch
`identityMedia: absent` to see it: the heading, statement, email block, rows and
note are pixel-identical, and the page reads as a deliberately quiet endpoint
rather than a layout with a hole in it.

This satisfies both required outcomes — the still can be **replaced** by a
Contact-specific working still at any aspect (the margin is width-constrained,
not height-constrained), or **removed entirely**, with no composition change.

## 5. Interaction

`mailto:` on the email. External links for social, placeholder hrefs. Focus is
wired on every link as a 2px ink outline with offset — never colour alone
(`design-system.md` §12). Social links carry an underline so colour is not the
sole indicator. Hover uses the standard accent.

No motion, no parallax, no cursor effects, no form fields, and **no CTA button
of any kind** — the email link is the call to action.

## 6. Responsive risks (recorded, not solved)

1. **Ruled rows → stacked pairs.** Label-left / value-right collapses at narrow
   widths; rows likely become label-above-value. `vimeo.com/khanhnhat` is the
   longest value and will decide the breakpoint.
2. **Long email wrapping.** At 38px the address already carries
   `word-break: break-word`; on a phone it will break mid-token, which looks
   broken for an address. It may need a smaller size or a two-line set.
3. **Heading scale.** `CONTACT` is sized against the spine, so it tracks the
   column it aligns to at any width — but at one column the spine becomes the
   full measure and the word gets very large relative to the statement beneath.

**A note on display coefficients generally.** The first value here was tuned by
eye against the grid and overran the spine by 55px — the same class of problem
as the face-dependent coefficient in `home-baseline-v2.md` §8.4. Sizing against
the element the type must align to, rather than against the page, removes the
guess. The other display coefficients in the candidate set (Home §1.4, Project
Detail, About) have **not** been re-checked against this and should be.
4. **Statement ordering.** Currently heading → statement → email. Stacked, that
   puts two blocks of reading before the action; the email may want to move up.
5. **Image placement.** One margin image becomes full-width when stacked — the
   loudest thing on a quiet page. Removing it at narrow widths is a legitimate
   answer, and the page already proves it survives that.
6. **Footer compression.** Two items at opposite ends will stack into two lines.

## 7. Publication-data gaps

- Real email address, Instagram and Vimeo handles.
- Real availability window and whether the reply-time claim should be made at
  all — it is a promise, and it is currently invented.
- A Contact-specific identity still, or a decision to ship without one.
- A true caption for that still, if one is used.

## 8. Architecture

**No new architecture is required.** Static text, links, one optional image.
Specifically absent, and not needed: contact submissions, message storage, spam
handling, a form endpoint, a booking system, CMS schema expansion, composer
blocks. Contact remains static / content-managed exactly as CLAUDE.md §19 and
ADR-0007 describe.

## 9. Readiness

**4B v2 is the accepted Contact candidate baseline** (§0). It borrowed 4A's one
useful principle without becoming 4A, and the refinement removed the page's only
structural weakness — a dependency on a borrowed image.

**Remaining gaps, by kind — none of which are composition:**

*Publication data*
- Real email address, Instagram handle, Vimeo URL.
- Real availability window, and a decision on whether the reply-time line is
  made at all (§0 decision 13 — it is currently invented).
- Confirmation of the Based and Travel values.

*Optional media*
- A Contact-specific identity still, **or** a decision to ship without one
  (§0 decisions 10–11 — both are valid outcomes).
- A true caption, only if a still is used.

*Responsive / mobile*
- All six risks in §6 — ruled rows stacking into label/value pairs, the 38px
  address breaking mid-token, heading scale at one column, statement ordering
  ahead of the action, the margin image becoming full-width, and footer
  compression (§0 decision 14).
