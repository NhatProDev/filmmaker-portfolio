# Page Specifications — Filmmaker Portfolio V1

- **Status:** Draft — **Not approved.** Home is derived from a candidate
  handoff; every other page is constraint-only.
- **Date:** 2026-09-22
- **Derives from:** `design-system.md` (Draft), `design-direction.md` (Draft),
  `design-handoff.md` (candidate), ADR-0003, ADR-0006, ADR-0007, ADR-0008,
  ADR-0009, CLAUDE.md §13
- **Precedence:** Becomes part of Tier 1 only on explicit Architect approval.

---

## 0. Evidence levels — read before using this document

The six pages have **not** received equal design attention, and this document
does not pretend otherwise.

### Maturity grades

**Maturity has two axes.** A page's *desktop composition* and its *responsive
behaviour* are graded separately, because they are validated by different work.
A page may be explored on one axis and pending on the other. **Neither axis
implies approval.**

| Page | Desktop maturity | Responsive maturity | Exploration | Reference | What exists |
|---|---|---|---|---|---|
| **Home** | **VISUALLY EXPLORED** | **PENDING RESPONSIVE VALIDATION** | ✅ candidate | ✗ none | A proposed default composition, block by block |
| **Art Works** | **VISUALLY EXPLORED** | **PENDING RESPONSIVE VALIDATION** | ✅ candidate (2C v2) | ✅ ref 3 | A proposed structure, element by element |
| **Project Detail** | **VISUALLY EXPLORED** | **PENDING RESPONSIVE VALIDATION** | ✅ candidate (1B v2) | ✅ ref 4 | A proposed composition, block by block |
| **About Me** | **VISUALLY EXPLORED** | **PENDING RESPONSIVE VALIDATION** | ✅ candidate (3B v2) | ✅ refs 1, 2 | A proposed composition, section by section |
| **Contact** | **VISUALLY EXPLORED** | **PENDING RESPONSIVE VALIDATION** | ✅ candidate (4B v2) | ✗ none | A proposed composition, element by element |
| **Private Project Gate** | **VISUALLY EXPLORED** | **RESPONSIVE VALIDATED** | ✅ candidate (5B v2) | ✗ none | A proposed composition with six states, exercised at four narrow widths and at constrained height |

**All six pages are now VISUALLY EXPLORED.** None is approved. Every page has a
candidate recorded in `docs/design/prototypes/`, and every prototype states in
its own header that it approves nothing.

**One page is RESPONSIVE VALIDATED — the Private Project Gate** (§6.9, from
`prototypes/private-gate/private-gate-5b-responsive.md`). It is a **candidate on
both axes**: validation reproduced and answered a real failure, and approves
nothing. **The other five remain pending responsive validation** — for them the
automatic safe-stack floor (`design-system.md` §11.2) is all that is guaranteed.

### What each grade permits

| Grade | Means | An implementer may |
|---|---|---|
| **VISUALLY EXPLORED** | A composition has been built and reviewed as a candidate. Still **not approved**. | Build the proposed composition, treating it as a default arrangement, not a template |
| **PARTIALLY EVIDENCED** | A visual reference exists, but **no composition has been designed from it**. | Apply the constraints and the reference's evidenced qualities. **Not** invent a final composition |
| **STRUCTURALLY SPECIFIED** | Scope, contracts and prohibitions are settled. Visual design has not begun. | Implement the contract. **Not** design the page |
| **PENDING VISUAL EXPLORATION** | Marks a specific unresolved item inside any page above. | Stop and raise it |

The **responsive** axis uses its own two grades. They describe narrow-width and
constrained-height behaviour only, and say nothing about approval:

| Responsive grade | Means | An implementer may |
|---|---|---|
| **RESPONSIVE VALIDATED** | The desktop candidate has been exercised at narrow widths **and at constrained height**, its failures reproduced, measured and answered by derivation rather than redesign. Still **not approved**. | Build the recorded derivations as candidate defaults. **Not** treat them as approved, production-ready, or verified on real hardware — see the real-device caveat in §6.9 |
| **PENDING RESPONSIVE VALIDATION** | A desktop candidate exists; its narrow-width and constrained-height behaviour has not been exercised. | Rely on the automatic safe-stack floor only (`design-system.md` §11.2). **Not** invent responsive behaviour, and **not** borrow another page's derivations |

**A reference image is not a design.** References 1–4 show *qualities* — an
oversized clipped wordmark, hairline frames, a justified still grid, an
asymmetric video panel. They do not specify page structure, navigation, states,
responsive behaviour or media configuration. Treating a reference as a finished
design for its page is the specific failure this table exists to prevent.

**Nothing here is approved.** All three explored candidates are recorded in
`docs/design/prototypes/`, and every prototype states in its own header that it
approves nothing. None has Project Owner / Architect approval.

Worth noting how the evidence now sits: exploration has reached all six pages,
but **reference evidence has not**. Three pages — Home, Contact and the Private
Project Gate — were explored with no visual reference at all, so their
candidates rest on exploration alone. The other three combine both. **Exploration
coverage is not the same as evidence coverage**, and the difference matters when
judging how much weight a candidate carries.

**For every page below VISUALLY EXPLORED, this document defines constraints
only.** Where a visual composition is not yet determined it is marked
**[PENDING VISUAL EXPLORATION]** and left open. Do not treat an absence as
permission to invent during implementation.

Grades **[INVARIANT] / [DEFAULT] / [ADVISORY]** carry the meaning defined in
`design-system.md` §0.

---

## 1. Home

> **Maturity: VISUALLY EXPLORED.** Candidate composition, **not approved**.

### 1.1 Purpose

The opening statement. Establish that this is a filmmaker's portfolio within one
viewport, and route the visitor into the work.

### 1.2 Hierarchy

A large moving image leads. Everything else is subordinate to it and to the work
it introduces. **[INVARIANT]** One primary element per view; one oversized
display gesture per view.

### 1.3 Theme environment **[INVARIANT]**

**Light.** Home is browsing surface — paper, not cinema.

### 1.4 Composer status **[INVARIANT]**

**Home is composer-driven** (ADR-0007). It is **not** a hard-coded template.

Every block below may be **reordered, removed, duplicated, replaced, hidden or
reconfigured** through the CMS with no source-code change. Header and footer are
**site chrome and live outside the composer** — they are not blocks.

### 1.5 Default example composition **[DEFAULT — not a template]**

**This is one arrangement, not positional law.** It exists to demonstrate a
rhythm:

> large moving image → quiet → cluster of previews → text → quiet media coda

| # | Block | Configuration |
|---|---|---|
| 1 | HERO / VIDEO | full bleed · `clamp(320px, 76vh, 900px)` · `AUTOPLAY_AMBIENT` |
| 2 | GRID | display type cols 1–12 · TEXT cols 1–5 · TEXT cols 9–12 |
| 3 | GALLERY `VIDEO_GRID` | 3 columns · 9 cells · 5 moving + 4 still · 4px gutters · `AUTOPLAY_VISIBLE` |
| 4 | GRID | TEXT cols 1–6 + IMAGE cols 10–12 · `align-items: end` |
| 5 | GALLERY `JUSTIFIED_ROWS` | stills at native aspect · one row · full bleed |

Block 1 is the one place on the site where `AUTOPLAY_AMBIENT` is valid — a
standalone ambient surface with no parent (ADR-0008).

**Built alternates [DEFAULT]:**

- **Asymmetric GRID** replaces block 3.
  **[ADVISORY]** The two are mutually exclusive and **must not sit adjacent** —
  a wall and an asymmetric field in one scroll was the failure mode that turned
  the page into a content platform. Composer-warnable, not blocked.
- **GALLERY `HORIZONTAL_STRIP`** — currently off.
  **[ADVISORY]** Needs **5+ projects**; below that it stops overflowing, the
  clipped-edge signal disappears and it reads as dead space.

### 1.6 Allowed block and layout patterns

**[INVARIANT]** Any of the seven canonical block types, in any composer-valid
arrangement. No block type is reserved to Home and none is forbidden on it.

**[DEFAULT]** Patterns 1–8 from `design-system.md` §15.

**[INVARIANT]** No block may depend on its neighbours to make sense. A section
that only reads correctly after a specific other section is not composer-safe.

### 1.7 Responsive

**[INVARIANT]** Desktop composes explicitly; tablet derives; mobile safe-stacks
unless overridden. **[DEFAULT]** Wall columns 3 / 2 / 1.

**[INVARIANT]** The oversized display type adapts by itself — container-width
units, no breakpoint rule.

**[INVARIANT]** Home still requires a mobile design review. The automatic
fallback guarantees nothing is broken, not that anything is good.

### 1.8 Media behaviour

**[INVARIANT]** Hero and wall use `COVER`; native aspect elsewhere except the
two admitted uniform surfaces (`design-system.md` §7.2).

**[DEFAULT]** Wall cells 16:9, 4px gutters, no captions, no chrome. Still cells
are rest points, part of the pattern.

**[INVARIANT]** Every autoplay surface is muted, resolves its poster
`poster_media_id → thumbnail_url → empty well`, and shows the poster when
autoplay is refused.

### 1.9 Motion

**[DEFAULT]** The signature light-to-dark transition fires from any element
carrying a project reference. **[INVARIANT]** Owned by the shell, not the block.

**[INVARIANT]** No interface motion around moving footage. **[DEFAULT]** One
moving field per viewport, carried by `--band`.

### 1.10 Navigation and chrome

**[DEFAULT]** The navigation line sits on the same 12 columns as content —
identity mark cols 1–5, destinations right-aligned cols 7–12. Not sticky. No
rule, no pill, no frosted panel, no arrows.

### 1.11 States

| State | Behaviour |
|---|---|
| **Loading** | Poster frames render first; video fades in over them structurally. No spinner over media. |
| **Empty composition** | **[PENDING]** Home with no blocks is possible via the composer. What it renders is undesigned. |
| **Media not ready** | `media.status != READY` → empty media well (`--frame`), a designed state, not a broken one. |
| **Autoplay refused** | Poster holds. Not an error. |
| **Reduced motion** | All video paused on posters; transition becomes a hard cut. |

---

## 2. Art Works

> **Maturity: VISUALLY EXPLORED.** Candidate structure **2C v2**, **not approved**.
>
> Evidence: `docs/design/prototypes/art-works/Art Works 2C v2.dc.html` and
> `art-works-2c-v2.md`. Sibling directions 2A, 2B and 2C v1 are retained in
> `Art Works Directions.dc.html` as exploration record only. Reference 3
> continues to apply.
>
> Art Works remains **data-driven** (§2.2). Exploring it produced a candidate
> *structure*, not a composed page, and added no block types.

### 2.1 Purpose

The index of published work. A browsing surface whose job is to get the visitor
into a project.

### 2.2 Composer status **[INVARIANT]**

**Art Works is data-driven, not composer-driven** (ADR-0007). It renders the
project list. It may expose presentation options; it does **not** become a free
page builder.

### 2.3 Theme environment **[INVARIANT]**

**Light.**

### 2.4 Data contract **[INVARIANT]**

```text
status = PUBLISHED AND deleted_at IS NULL AND visibility = 'PUBLIC'
```

**PRIVATE projects never appear here — not even as locked placeholders** and not
by cover, short description, year or category (ADR-0003). Ordered by
`displayPosition` ascending.

### 2.5 What reference 3 evidences **[DEFAULT]**

Three rows of cinematic stills, full bleed, edge to edge. Within a row, images
share a height and keep native aspect; rows differ in height and do not
column-align. Tight even gutters. **No captions, no titles, no cards, no
borders, no shadows, no hover chrome.** It reads as a contact sheet.

This maps to **GALLERY `JUSTIFIED_ROWS`**, which is also what the brief's
"Pixieset" cue describes.

### 2.6 Candidate structure — 2C v2 **[DEFAULT — candidate, not a template]**

Recorded from `docs/design/prototypes/art-works/Art Works 2C v2.dc.html` and its
review record `docs/design/prototypes/art-works/art-works-2c-v2.md`. Directions
2A, 2B and 2C v1 remain in
`docs/design/prototypes/art-works/Art Works Directions.dc.html` as exploration
record only.

**The core idea: a typographic project index above a dense visual sheet.** The
index names the work; the sheet shows it; the two point at each other.

| # | Element | Notes |
|---|---|---|
| 1 | **Site chrome / Works heading** | One display line and a right-aligned count. Chrome, outside any composer. |
| 2 | **Typographic project index** | numeral · title · year. Column count follows project count. |
| 3 | **Justified project-media sheet** | GALLERY `JUSTIFIED_ROWS` · native aspect · 4px gutters · no card chrome |
| 4 | **Index ↔ media pairing** | Plate numerals pair the two at rest; hover and keyboard focus enrich it |
| 5 | **Restrained moving-preview scheduling** | At most one preview moving at a time |
| 6 | **Project Detail transition handoff** | The clicked media frame is the transition origin |

Counts exercised in the prototype: **3, 9 and 18 projects.** Target row height
follows the count, so fewer projects give larger frames. A ragged tail below a
threshold is merged into the row above and that row re-solved — **cells stay
contiguous and in order; only the row break moves.**

#### Art Works is data-driven, not a composer page **[INVARIANT]**

**No blocks were added, and none may be.** Art Works is one data-driven view: a
list rendering and a gallery rendering of the same ordered collection (ADR-0007,
§2.2). It has no composed regions and no per-project layout authoring. It is
**not a general free-form composer page**, and exploring it did not make it one.

#### Ordering **[INVARIANT]**

**`displayPosition` defines semantic project order.** Index DOM order and sheet
DOM order both follow it, and nothing re-sorts.

**Gallery packing may determine row breaks but never reorders projects.** The
packer consumes items in order and decides only where rows break; the
orphan-tail merge moves a row boundary, not an item. The prototype audits this
live and fails loudly if it stops being true.

#### Plate numerals — current candidate decision **[DEFAULT]**

Numerals are **ON** in the candidate.

- A numeral is an **identification mark, not a caption** — one glyph pair, no
  title, no year, no box.
- **Title and year remain in the typographic index**, not on the media.
- Numerals are **presentation-only**.
- A numeral **fades as the project transition begins**, so the frame travels as
  pure media.

`numerals: off` is built so the alternative can be judged; with it off the page
reverts to hover-only identification.

**This is an Art Works decision and is not promoted into a global gallery rule.**
Nothing here changes GALLERY semantics for any other surface.

#### Index ↔ media pairing **[DEFAULT]**

At rest the plate numeral carries identification, so the relationship does not
depend on an approach state. Hover and keyboard focus are enrichment.

**Hover and keyboard focus run one pairing routine** — verified in the prototype
as a single code path — so the two cannot drift apart. Focus additionally draws
a visible ring, per the §12 accessibility floor.

**Clicking either the index row or the media frame resolves to the same
project**, and in both cases **the media frame is the transition origin**.
Clicking an index row does not hand off from the row.

#### Moving-preview scheduling **[DEFAULT — page policy]**

**At most one `AUTOPLAY_VISIBLE` preview is active at a time on Art Works.** The
eligible frame nearest the viewport's vertical centre plays; every other frame
holds its poster, and sources are released when a frame stops being active.

This is how a dense sheet honours the one-moving-field density guidance
(`design-system.md` §8.3): a naive per-cell rule puts four or five clips on
screen at once.

**This is an Art Works scheduling policy, not a redefinition of
`AUTOPLAY_VISIBLE`.** ADR-0008's mode semantics are unchanged, all derived flags
are unchanged, and no ADR is required — see §2.6a. Under
`prefers-reduced-motion` everything stops and every source is released.

#### Transition handoff **[DEFAULT]**

The clicked media frame is the origin. The flown frame is **not required to
carry the project title**, the numeral leaves as the handoff begins, and the
**destination Project Detail HERO owns project-title presentation** (ADR-0010).
Art Works therefore needs no title-bearing frame state.

#### Constraints that hold regardless of structure

**[INVARIANT]** No card chrome. **[INVARIANT]** Native aspect preserved —
`JUSTIFIED_ROWS` is not an admitted uniform surface. **[INVARIANT]** Media-first;
the index is the work, not a list about the work. **[INVARIANT]** Any video
preview here is a multi-video surface → `AUTOPLAY_VISIBLE`, never
`AUTOPLAY_AMBIENT`.

### 2.6a Why the one-preview policy needs no ADR

`AUTOPLAY_VISIBLE` keeps its ADR-0008 meaning exactly: autoplay, forced muted,
`playsInline`, must pause and release off-screen, no controls. All of those are
derived from the mode and none is changed.

What the page adds is a **selection rule inside the lifecycle ADR-0008 already
defines** — *visible: play · near: prepare · far: pause and release* — whose
mechanism that ADR leaves "deliberately unspecified." Choosing which single
visible cell is promoted to *play* sits in exactly that space.

It is also **stricter than ADR-0008's floor, never looser**: §6 requires that a
surface "must not naïvely autoplay or decode an unbounded number of videos," and
a cap of one is the strongest available bound. Off-screen frames release their
sources, as §6 requires.

**It remains a system constant, not an administrator setting** — the concurrency
figure is chosen by the page, is not exposed in configuration, and must not
become an admin control. The prototype's `previews` switch is a review
affordance, not a CMS field.

### 2.7 Unresolved **[PENDING VISUAL EXPLORATION]**

**Mobile and tablet remain pending visual validation.** The candidate structure
was exercised at desktop widths only.

Carried responsive questions, deliberately **not** solved in architecture:

1. **Narrow-width index layout.** Index columns follow project count (1 / 2 / 3);
   at tablet and mobile this must fall to one column, and an 18-project list then
   pushes the sheet far below the fold. Whether the index stays above, becomes a
   collapsible summary, or moves beside the sheet is undesigned.
2. **Identification without hover.** The plate numeral is the answer to this, and
   is why it exists — but it needs the index reachable while looking at the
   sheet, which one-column stacking breaks.
3. **`JUSTIFIED_ROWS` narrow-width behaviour.** A row of wide covers becomes a
   short strip below roughly 640px. The governing **principle is now approved**
   (`design-system.md` §11.5): GALLERY does not inherit GRID child stacking, and
   every presentation mode owes bounded narrow-width behaviour of its own.
   **`JUSTIFIED_ROWS`' actual behaviour is still undefined** — row heights,
   items-per-row and the narrow-width algorithm remain pending mobile visual
   validation (§16 item 10). Art Works cannot be specified at narrow widths until
   it exists.
4. **Density at different project counts.** 18 projects at a small target row
   height is a very long page; pagination or lazy extension is unresolved.
5. **Transition behaviour on touch/mobile**, where there is no hover state to
   precede the tap.

Also still open from earlier: filtering or category affordances · whether the
sheet presentation should be switchable at all.

**Data / model questions raised by the prototype, not invented into the model:**
whether a moving preview should be an explicit per-project choice rather than
inferred from "a clip exists" · whether the plate numeral should be a stable
catalogue number rather than `displayPosition`, which renumbers on reorder ·
cover aspect must be available before layout or the first paint reflows.

### 2.8 States

| State | Behaviour |
|---|---|
| **Empty** | No published public projects. **[PENDING]** — must be designed; an empty screen is an invitation to act, not a blank. |
| **Loading** | Posters first, as Home. |
| **Partial** | Some media not `READY` → empty wells in flow. |

---

## 3. Project Detail

> **Maturity: VISUALLY EXPLORED.** Candidate composition **1B v2**, **not approved**.
>
> Evidence: `docs/design/prototypes/project-detail/Project Detail 1B v2.dc.html`
> and `project-detail-1b-v2.md`. Sibling directions 1A and 1C are retained in
> `Project Detail Directions.dc.html` as exploration record only. Reference 4
> continues to apply.
>
> The bounded HERO title-overlay **capability is approved** (ADR-0010); its
> visual use here remains candidate. The composition still carries one open
> media question (poster/film `fit`, §3.9) and mobile, which is identified and
> not designed.

### 3.1 Purpose

A screening. One project, told in its own visual language.

### 3.2 Composer status **[INVARIANT]**

**Composer-driven.** Compositions may differ from project to project — that
flexibility is a core product requirement, and the brief's "flexible enough to
tell different visual stories instead of using one fixed template" is the
requirement this page exists to satisfy.

### 3.3 Theme environment **[INVARIANT]**

**Dark.** Entering a project darkens the room. This is the site's signature
structural move; polarity is fixed and not visitor-toggleable.

### 3.4 What reference 4 evidences **[DEFAULT]**

Full-bleed video with a visible transport bar and a plain circular play
affordance. Beside it a dark panel: serif caps project title, a tight 2×3
thumbnail cluster, a one-line lead, then small body copy. A second full-bleed
video below, **vertically offset** so the two deliberately do not align. Large
deliberate void in the panel.

This is `HERO` / `VIDEO` / `TEXT` / `GRID` composed on one page, and it is the
direct evidence for asymmetric GRID composition (ADR-0004, ADR-0006).

### 3.5 Candidate composition — 1B v2 **[DEFAULT — candidate, not a template]**

Recorded from `docs/design/prototypes/project-detail/Project Detail 1B v2.dc.html`
and its review record
`docs/design/prototypes/project-detail/project-detail-1b-v2.md`. The sibling
directions 1A and 1C remain in
`docs/design/prototypes/project-detail/Project Detail Directions.dc.html` as
exploration record only.

**The defining idea: the project opens directly into the film.** No title-card
preamble. The hero carries the film and the film's name; everything that has to
be *read* sits below it.

| # | Block | Configuration |
|---|---|---|
| 1 | **HERO / VIDEO** | Film-first, full bleed, `CLICK_TO_PLAY`. Bounded title overlay — **capability approved** (ADR-0010), **visual treatment candidate**. Title resolves from `projects.title`, never authored. The prototype also builds the legal alternative: the title as a TEXT block below the hero. |
| 2 | **GRID** | Metadata list + project statement |
| 3 | **GALLERY `JUSTIFIED_ROWS`** | Supporting stills, native aspect, full bleed |
| 4 | **GRID** | One supporting video, `AUTOPLAY_VISIBLE`, + caption |
| 5 | **GRID / TEXT** | Credits, against deliberate negative space |
| 6 | **IMAGE** | Full-bleed coda |
| 7 | *site chrome* | Footer: next project · all works. **Not a block** — outside the composer |

Reading and looking alternate, with `--band` carrying every seam. **No two moving
fields share a viewport**: the hero is click-to-play and therefore still until
asked, so the only autoplaying surface is the single supporting loop in block 4.

### This is a candidate arrangement, not a universal Project Detail template

**[INVARIANT]** Project Detail is composer-driven (§3.2), and compositions **may
and should differ from project to project** — that flexibility is the core
product requirement this page exists to satisfy.

A project may **reorder, remove, replace, duplicate, hide or omit** any block
above. The prototype's own review records what each removal costs
(`project-detail-1b-v2.md` §5): no block reads as a continuation of its
neighbour, and every one of them works anywhere in the sequence. The only
ordering the design *prefers* — film first — is the page's idea, not a
dependency. An administrator who moves it gets a different but coherent page.

Two supporting notes from the same review, carried as **[ADVISORY]**:

- **`VIDEO_GRID` is deliberately not used here.** A project's supporting material
  is heterogeneous, and a uniform 16:9 wall would flatten it. It remains
  available as configuration for a project that genuinely has many short clips.
- **Below roughly three stills, block 3 is an IMAGE, not a gallery.** A
  `JUSTIFIED_ROWS` row with too few items grows tall rather than reading as a
  contact sheet.

### 3.6 Playback **[INVARIANT]**

**The primary film and ambient loops must not share a playback behaviour.**

| Surface | Mode |
|---|---|
| Primary project film | `CLICK_TO_PLAY` — real controls, real transport, audio available |
| Supporting loops, thumbnail clusters, galleries | `AUTOPLAY_VISIBLE` — muted |
| Anything inside a GRID or GALLERY | never `AUTOPLAY_AMBIENT` |

**[ADVISORY]** `CONTAIN` on the primary film — a film the visitor sits down to
watch is shown whole. `COVER` on browsing and preview surfaces.

### 3.7 Allowed patterns

**[INVARIANT]** Any canonical block type, any composer-valid arrangement, one
level of GRID nesting. **[DEFAULT]** Asymmetric media/text composition, media
wall, editorial text section, media caption.

### 3.8 Private projects **[INVARIANT]**

A PRIVATE project is reachable only by direct URL. Without a valid access cookie
the response is `403` carrying **no project content** — no title, cover,
description, blocks or media (ADR-0003). See §6.
### 3.9 Unresolved

One item still **blocks specification**. The HERO-overlay architecture question
that previously sat here has been **resolved by ADR-0010** and is recorded below
as settled.

**1. Bounded HERO title overlay — [CAPABILITY APPROVED, ADR-0010].** 1B v2's
defining idea places the project's name inside the opening frame, so the frame
handed off by the light-to-dark transition already carries it. The prototype
built **both** answers and switched between them with `titleMode`:

- **A — HERO with bounded overlay content** (prototype default).
  **Now approved as an architecture capability** (ADR-0010): intra-block
  presentation, not nesting and not the deferred GRID inter-child overlap
  primitive. The title resolves from `projects.title` and is **never authored in
  block config**. Configuration is closed — anchor from a closed enum plus the
  existing 12-column placement. Scrim, typography, colour, z-order and dismissal
  are derived. Valid on an `IMAGE` HERO or a `CLICK_TO_PLAY` video HERO only.
  Dismissal is defined against **media activation**, not an observed playback
  event.
- **B — TEXT block immediately after the HERO** (`titleMode: stacked`).
  **Still legal**, unchanged. Costs the transition: the flown frame lands on an
  anonymous rectangle and the title arrives as a separate event.

**What remains candidate here is the visual treatment, not the capability** —
the anchor and column placement chosen for this page, and the narrow-width
stacked fallback, which ADR-0010 requires the system to derive but leaves to
mobile design validation. The prototype's default is evidence, not the design.

**2. Poster / film `fit` mismatch — [CARRIED MEDIA QUESTION].** The hero poster
renders `COVER` and the film plays `CONTAIN`, so pressing play reframes. This
follows from §7.3 itself, which lists hero surfaces under `COVER` and primary
films under `CONTAIN` — the Project Detail hero is both at once. The prototype
records a **proposed reading, not applied**: a `CLICK_TO_PLAY` poster should
inherit the film's `fit`. Coupled to the unresolved letterbox method
(`design-system.md` §16 item 1) and the deferred focal point (§7.6).

**ADR-0010 deliberately did not decide this** — it fixes no relationship between
idle framing and playback framing.

### 3.10 Pending visual exploration **[PENDING VISUAL EXPLORATION]**

Project metadata treatment — year, category, client, credits — and specifically
**how to present them without the middle-dot meta string** that §13 forbids ·
the transport/controls design for `CLICK_TO_PLAY` · credits block composition ·
next/previous project affordance, if any · **mobile composition, including the
overlaid title's narrow-width fallback** · how the signature transition lands and
reverses on this page.

### 3.11 States

| State | Behaviour |
|---|---|
| **404** | Project absent or intentionally hidden. **[PENDING]** |
| **403 locked** | Private, no access cookie → the gate, §6. Error envelope only. |
| **Loading** | Poster-first. |
| **Media not ready** | Empty well. |

---

## 4. About Me

> **Maturity: VISUALLY EXPLORED.** Candidate composition **3B v2**, **not approved**.
>
> Evidence: `docs/design/prototypes/about/About Me 3B v2.dc.html` and
> `about-me-3b-v2.md`. Sibling directions 3A, 3B v1 and 3C are retained in
> `About Me Directions.dc.html` as exploration record only. References 1 and 2
> continue to apply.
>
> About Me remains **content/file-managed** (§4.2). Exploring it required **no
> new architecture** and no composer blocks.

### 4.1 Purpose

Who the filmmaker is, in their own register. Editorial, personal, specific.

### 4.2 Composer status **[INVARIANT]**

**Not CMS-managed.** About Me content is **content-file managed** and committed
with the code (CLAUDE.md §19, ADR-0007). There is no About table and no About
API.

**Do not silently convert About into a page builder.** A small presentation
configuration is permitted only if the composer architecture genuinely requires
it — it does not today.

### 4.3 Theme environment **[INVARIANT]**

**Light.**

### 4.4 What references 1 and 2 evidence **[DEFAULT]**

**Reference 1** — the identity move: an oversized serif wordmark set larger than
the viewport, clipped at the right edge, **overlapped by the portrait** so the
second line is cut mid-letterform. Single accent used exactly three times. Narrow
serif body column lower-left. Meta beneath the portrait.

**Reference 2** — the editorial grammar: thin hairline rectangles used as layout
frames, deliberately offset so they intersect, with content **breaking out of
its own frames**. Scattered behind-the-scenes collage at varied sizes. Roughly
40% of the canvas empty. Zero accent colour — all colour from the photography.

### 4.5 Candidate composition — 3B v2 **[DEFAULT — candidate, not a template]**

Recorded from `docs/design/prototypes/about/About Me 3B v2.dc.html` and its
review record `docs/design/prototypes/about/about-me-3b-v2.md`. Directions 3A,
3B v1 and 3C remain in `docs/design/prototypes/about/About Me Directions.dc.html`
as exploration record only.

**The core idea: About Me is a filmmaker profile feature.** Writing leads, the
portrait establishes identity, process imagery is evidence, experience is
editorial metadata.

| # | Section | Notes |
|---|---|---|
| 1 | **Site chrome** | Identity mark + nav on the same 12 columns. Not content. |
| 2 | **Biography-led opening** | Text cols 1–7 · portrait cols 9–12 · both hang from one **shared datum rule**. The first evidence image sits under the biography. |
| 3 | **Immutable portrait** | `media/w/portrait.jpg` at **native aspect**, never cropped — see §4.6a |
| 4 | **Process / BTS evidence** | Three real frames, each answering a line of writing from the opposite side |
| 5 | **Restrained Selected Experience** | Four ruled entries · year in a 5ch column · role and production in body type |
| 6 | **Closing contact line** | Present in the candidate; the page closes rather than stopping |

The reading sequence is **one descending spine**: *identity → biography →
evidence → experience*. Text always begins at column 1 and images answer from
the opposite side.

#### The bounding device is rules, not a container **[DEFAULT]**

The biography is bounded by a **shared datum rule** spanning all twelve columns
above it and a **partial closing rule** at 46% of the column below it.

**This is deliberately a partial rule, not a card-style full rectangle.** The
earlier direction used a bounding rectangle; it was removed. Structure without a
container. The portrait hangs from the same datum as the text, offset below it —
so non-alignment reads as a deliberate offset from a common line rather than as
two unrelated columns.

#### Process imagery is evidence, not a gallery **[DEFAULT]**

Three images, each with a stated reason and a caption describing what the frame
actually is. Each is answered by a short line of writing on the opposite side,
so the imagery reads as evidence *for the text*.

**Deliberately the sparser surface:** three images across the page, against 9–18
frames in an Art Works sheet. About is not a portfolio gallery, and its imagery
must not be read as one.

#### What the candidate does not contain **[INVARIANT]**

Verified absent from the prototype markup, not merely asserted:

**No timeline UI · no cards · no skill meters · no software or logo cloud · no
badges or icons · no arbitrary overlap primitive.**

Selected Experience is metadata at the foot of a feature, **not a CV**. No
`box-shadow`, no `border-radius`, no authored `z-index` appears in the
composition.

#### About requires no new architecture **[INVARIANT]**

**About Me is content/file-managed in V1** (§4.2, CLAUDE.md §19, ADR-0007).
Exploring it changed nothing about that:

- **It is not a composer-owned page.** No composed regions, no per-section
  layout authoring.
- **No arbitrary blocks are required.** The page is grid placement, rules,
  images at native aspect and text.
- **No free-form layout editor is required.**
- **No new overlap primitive is required.** The candidate does **not** touch
  `design-system.md` §5.5's deferred inter-child overlap, and that deferral
  stands.
- **No schema, contract or ADR change is required.**

#### This is a candidate arrangement, not a universal template

The current desktop composition is **candidate evidence**. It is one accepted
arrangement of a content-managed page, not a fixed template and not an approved
specification. The prototype's own header states it approves nothing.

### 4.6 The About portrait — width mode **[INVARIANT]**

The About portrait is the **motivating case for width mode**
(`design-system.md` §5.3).

Under safe mobile stacking it would go to full width and become a profile photo
rather than an editorial portrait. **Width mode lets it stay deliberately
narrower than its container after stacking.** This is why width mode is required
rather than optional.

### 4.6a The portrait is immutable at native aspect **[INVARIANT]**

The About portrait is `media/w/portrait.jpg` — **native 970 × 1505, aspect
0.6445**, verified against the file itself.

**It is rendered at native aspect and must never be altered:** no crop, no zoom,
no reframe, no transform, no `object-fit: cover`, no `object-position`. The
candidate renders it with width and automatic height only.

**The prototype enforces this with a live audit** that compares natural to
rendered aspect and inspects computed `object-fit`, printing `✗ ALTERED` if the
aspect diverges or `cover` ever appears. That audit is evidence the rule is
holdable, not a specification of how to implement it.

This sits alongside — and does not replace — the width-mode requirement in §4.6.
Width mode governs **how wide the portrait is allowed to be** after stacking;
this governs **that its aspect is never changed** at any width. A width cap is
not a crop.

### 4.7 Constraints

**[INVARIANT]** Reading measure ≤ 46ch · negative space is load-bearing and must
not be backfilled · no card chrome · the oversized display gesture is permitted
here and is one per view.

### 4.8 Unresolved **[PENDING VISUAL EXPLORATION]**

**Mobile and tablet remain pending visual validation.** The candidate was
exercised at desktop widths only, and the prototype records its responsive risks
without designing for them.

Carried responsive risks, deliberately **not** solved in architecture:

1. **Portrait/text stacking order.** DOM order puts the biography before the
   portrait, so mobile leads with text. Defensible for a writing-led page, but
   identity arrives after three paragraphs.
2. **Loss of desktop non-alignment.** The deliberate offset and the tail that
   nearly meets *are* the composition; stacked, both vanish and the page risks
   becoming a plain column.
3. **The shared datum becoming a simple divider.** The datum spans twelve
   columns; above a single stacked column it may read as a divider rather than
   as a line two things hang from.
4. **Process-image and text pairing weakening when stacked.** Each image
   currently answers a line of writing from the opposite side; stacked, that
   becomes image-then-text and the "answer" relationship weakens.
5. **Caption reading order** once images and their answering text are stacked.
6. **Selected Experience row wrapping.** Year and role share a row; at 375px
   that wraps, and the year likely becomes a line above rather than a column
   beside.
7. **Exact mobile treatment of the biography rules.** There is no frame to lose,
   only rules — but the partial closing rule set as a percentage may need a
   fixed measure at narrow widths.

#### Publication asset gaps — not architecture blockers

Recorded by the prototype and **explicitly not blocking** the candidate
(`about-me-3b-v2.md` §0 decision 11, §7):

- **One missing on-set operating frame** (~3:2, hands and camera in the room).
  The prototype holds a designed placeholder slot for it, which is the accepted
  interim state.
- **A second working portrait**, distinct from the seated one.
- **About-specific process imagery.** Two process frames are currently shared
  with Art Works as project covers — acceptable for judging composition, but for
  publication About should own its own.
- **A master file for the portrait.** Separately recorded in
  `prototypes/home/home-baseline-v2.md` §9: the current asset is a crop out of a
  screenshot and is soft at display size. Its *aspect* is correct and immutable
  (§4.6a); its *resolution* is the gap.

**Do not substitute unrelated media for any of these.**

#### Copy

Biography copy at all four levels is **provisional**, as are the Selected
Experience entries and the captions, which describe the prototype's actual
frames.

### 4.9 States

Static content; no loading, empty or error states beyond the media well.

---

## 5. Contact

> **Maturity: VISUALLY EXPLORED.** Candidate composition **4B v2**, **not approved**.
>
> Evidence: `docs/design/prototypes/contact/Contact 4B v2.dc.html` and
> `contact-4b-v2.md`. Sibling directions 4A and 4B v1 are retained in
> `Contact Directions.dc.html` as exploration record only. No visual reference
> exists for this page.
>
> Contact remains **static / content-managed** (§5.2). Exploring it required
> **no new architecture**, no backend and no composer blocks.
>
> **All contact values in the prototype are prototype copy** — see §5.6.

### 5.1 Purpose

Let someone make contact. Nothing more.

### 5.2 Composer status **[INVARIANT]**

**Static in V1.** Contact is content-managed and committed with the code
(CLAUDE.md §19, ADR-0007). It is **not composer-owned**.

Specifically absent, and not required:

- **no contact form** and no form fields of any kind
- **no submission endpoint**
- **no message database or persistence table**
- **no spam workflow**
- **no email provider integration**
- **no booking system**
- **no CMS schema expansion and no composer blocks**

It may contain an email / `mailto:` link, social links, and other public contact
information.

### 5.3 Theme environment **[INVARIANT]**

**Light.**

### 5.4 Candidate composition — 4B v2 **[DEFAULT — candidate, not a template]**

Recorded from `docs/design/prototypes/contact/Contact 4B v2.dc.html` and its
review record `docs/design/prototypes/contact/contact-4b-v2.md`. Directions 4A
and 4B v1 remain in `docs/design/prototypes/contact/Contact Directions.dc.html`
as exploration record only.

**The core idea: an editorial contact sheet with one primary line.** Everything
that carries meaning sits on a single left spine.

| # | Element | Notes |
|---|---|---|
| 1 | **Site chrome** | Identity mark + nav on the same 12 columns. Not content. |
| 2 | **`CONTACT` heading** | Display caps, sized against the **spine** so it ends on the same edge as the rules beneath it |
| 3 | **Collaboration / availability statement** | One short paragraph at a bounded measure |
| 4 | **Primary email action** | Its own block above the metadata — see §5.5 |
| 5 | **Secondary metadata** | Ruled label/value rows: social, location, availability |
| 6 | **Optional identity media** | A margin figure — see §5.6 |
| 7 | **Closing editorial note** | Two sentences on the spine; the page closes rather than stopping |

A **shared datum rule** opens the page across all twelve columns — the same
device as About Me 3B v2, so the two pages read as one publication. Structure is
**rules and alignment, never containers or cards.**

#### The email is the call to action **[INVARIANT]**

**There is no CTA button, and none is required.** The email link itself is the
call to action. Adding a button would make the page a marketing funnel, which
§5.7 forbids.

#### What the candidate does not contain **[INVARIANT]**

Verified absent from the prototype markup, not merely asserted:

**No form fields · no `<input>`, `<textarea>`, `<button>` or `<select>` · no CTA
button · no cards · no `box-shadow` · no `border-radius` · no marketing funnel
treatment · no decorative motion, transitions or keyframes.**

The prototype carries its own audit line asserting `forms 0 · no input, no
submit, no endpoint`.

#### Contact requires no new architecture **[INVARIANT]**

Static text, links and one optional image. Nothing here needs a schema field, an
endpoint, message storage, spam handling, a booking workflow or a composer
block. Contact remains static exactly as CLAUDE.md §19 and ADR-0007 describe.

#### This is a candidate arrangement, not a universal template

The current desktop composition is **candidate evidence**, not a fixed template
and not an approved specification. The prototype's own header states it approves
nothing.

### 5.5 Email interaction **[DEFAULT]**

The email is implemented as **`mailto:`** and is **visually primary over the
secondary metadata**. Four independent signals carry that priority, so it never
rests on one:

| Signal | Email | Metadata rows |
|---|---|---|
| Type size | display, ~2.4× the rows | body |
| Colour | accent | ink / muted |
| Rule above | 1px **ink** | 1px hairline |
| Label | tracked caps on its own line | italic muted, inline |

**Social links remain secondary** — body size, hairline rules, inline labels.

**[INVARIANT]** Keyboard focus is visible as an outline, wired on every link.
**Colour is never the sole indicator** — secondary links carry an underline, and
focus is an outline rather than a colour change (`design-system.md` §12).

**[INVARIANT]** No decorative motion is required or permitted: no transitions,
no parallax, no cursor effects.

### 5.6 Optional identity media **[DEFAULT — optional and provisional]**

The identity still is **optional and provisional**. Both shipping with one and
shipping without one are valid outcomes.

**[INVARIANT]** **The page must remain compositionally valid if the still is
absent.** Everything carrying meaning sits on the spine; the still occupies
margin the composition does not need. The prototype proves this with an
`identityMedia: present | absent` switch — with it absent, the heading,
statement, email block, rows and note are pixel-identical, and the page reads as
a deliberately quiet endpoint rather than a layout with a hole in it.

**[INVARIANT]** **Meaningful contact information never depends on the image.**

**The current still is borrowed from Art Works and is not a permanent Contact
dependency.** Its caption says so honestly. It may be **replaced** by a
Contact-specific working still at any aspect — the margin is width-constrained,
not height-constrained — or **removed entirely**, with no composition change.

**Do not invent unrelated replacement media.** A Contact-specific still is a
**publication asset gap, not an architecture blocker.**

### 5.7 Constraints

**[INVARIANT]** Not a form, not a product page, no SaaS CTA treatment.
**[DEFAULT]** The email is one of the three admitted accent uses — and it appears
exactly once in the page body.
**[INVARIANT]** Plain language, active voice; a control names what it does.

### 5.8 Unresolved **[PENDING VISUAL EXPLORATION]**

**Mobile and tablet remain pending visual validation.** The candidate was
exercised at desktop widths only, and the prototype records its responsive risks
without designing for them.

Carried responsive risks, deliberately **not** solved in architecture:

1. **Long email wrapping.** At display size the address already needs
   `word-break`; on a phone it will break mid-token, which looks broken for an
   address. It may need a smaller size or a deliberate two-line set.
2. **Ruled label/value rows stacking.** Label-left / value-right collapses at
   narrow widths; rows likely become label-above-value. The longest value will
   decide the breakpoint.
3. **`CONTACT` heading scale.** The heading is sized against the spine, so it
   tracks the column it aligns to at any width — but at one column the spine
   becomes the full measure and the word grows very large relative to the
   statement beneath it.
4. **Statement ordering.** Currently heading → statement → email. Stacked, that
   puts two blocks of reading ahead of the action; the email may want to move up.
5. **Identity-media placement or removal.** One margin image becomes full-width
   when stacked — the loudest thing on a quiet page. Removing it at narrow
   widths is a legitimate answer, and §5.6 already proves the page survives that.
6. **Footer / closing-note compression.** Two items at opposite ends stack into
   two lines.

#### Publication-data gaps — not architecture blockers

**Every contact value in the prototype is prototype copy, not publication fact.**
The email address, Instagram and Vimeo handles, location, availability window
and reply-time statement are **all invented for the prototype.**

- Real email address, Instagram handle and Vimeo URL.
- Real availability window, and confirmation of the location and travel values.
- **Whether the reply-time claim should be made at all** — it is a promise, and
  it is currently invented. This is a decision, not a copy task.
- A Contact-specific identity still, **or** a decision to ship without one
  (§5.6 — both are valid).
- A true caption, only if a still is used.

**Do not treat any current value as a publication fact, and do not substitute
unrelated media.**

#### Still open from before exploration

Whether Contact is a page or a section of About.

---

## 6. Private Project Gate

> **Maturity: VISUALLY EXPLORED** (desktop) · **RESPONSIVE VALIDATED**
> (narrow width and constrained height). Candidate composition **5B v2**,
> **not approved on either axis**.
>
> Desktop evidence:
> `docs/design/prototypes/private-gate/Private Gate 5B v2.dc.html` and
> `private-gate-5b-v2.md`. Sibling directions 5A and 5B v1 are retained in
> `Private Gate Directions.dc.html` as exploration record only. No visual
> reference exists for this page.
>
> Responsive evidence: `Private Gate 5B Responsive.dc.html` and
> `private-gate-5b-responsive.md` (§6.9). **The desktop candidate is unchanged
> by it** — the responsive artifact validates 5B v2, it does not replace or
> reinterpret it. There is no 5C.
>
> Exploring it required **no new architecture**, and validating it responsively
> required none either. The existing project-access contract already carries the
> whole flow (§6.2).
>
> The gate's theme environment was **resolved in favour of this candidate** on
> 2026-09-22 (§6.3). What remains is **real-device QA** (§6.9) and the
> engineering / security questions in §6.10 — none is a visual-design blocker.

### 6.1 Purpose

Take a project password from a visitor who already holds the direct URL, and let
them in.

### 6.2 Access model **[INVARIANT]**

Per ADR-0003: a PRIVATE project is **not enumerated anywhere public**. The
visitor arrives with the URL. Without a valid access cookie, `GET` returns `403`
with an error envelope and **no project content**. The visitor submits the
password; the server verifies and sets a signed HTTPOnly cookie.

```text
project-access password
  → server-side verification
    → signed HTTPOnly project-access cookie
      → protected Project Detail
```

**[INVARIANT]** This is **project access, not identity authentication.** There
is no account, no user record and no reusable session.

**[INVARIANT]** It is **separate from admin authentication** and shares nothing
with it — not the cookie, not the session, not the verification path.

Forbidden: "Sign in" · a username or email field · "Forgot password" · "Create
account" · any account framing whatsoever.

### 6.3 Theme environment **[INVARIANT]**

**Resolved by Project Owner decision, 2026-09-22**, in favour of the candidate
and the hard non-disclosure rule.

**Superseded and no longer valid:** *"the gate inherits the environment of the
project it guards."* That rule conflicted conceptually with the stronger
pre-authorization non-disclosure invariant (§6.5) — **a protected project's
environment is itself project-derived presentation**, and exposing it before
access is verified discloses something about the work being guarded.

#### Pre-authorization **[INVARIANT]**

The gate uses a **route-independent, non-project-derived editorial surface.**

**[DEFAULT]** The V1 candidate uses the **light public surface**.

**[INVARIANT]** Before authorization the gate **must not inherit** any of the
protected project's:

- colour
- media or imagery
- theme
- typography variation
- any other project-derived presentation

**[INVARIANT]** The visual output must remain **non-disclosive**. Two visitors
holding URLs to two different private projects must not be able to tell the
gates apart.

#### Authorized handoff **[INVARIANT]**

**Only after successful authorization** may the experience transition into the
protected Project Detail environment.

**[DEFAULT]** The selected 5B v2 candidate uses the existing **light → dark
handoff** — the site's established transition into a project, arriving from a
page rather than from a clicked frame.

**[INVARIANT]** **Project Detail owns all project-specific presentation after
authorization** (§3). The gate contributes only the transition out of its own
surface, and prefetches nothing.

### 6.4 Candidate composition — 5B v2 **[DEFAULT — candidate, not a template]**

Recorded from `docs/design/prototypes/private-gate/Private Gate 5B v2.dc.html`
and its review record `private-gate-5b-v2.md`.

**The core idea: editorial access.** The gate is visually and editorially part
of the public site — the same datum rule, spine, type and palette as About and
Contact — and it is emphatically **not a login screen**.

| # | Element | Notes |
|---|---|---|
| 1 | **Public site chrome + escape route** | Identity mark and nav. *Back to works* is an ordinary keyboard-reachable link. |
| 2 | **`PRIVATE PROJECT` hierarchy** | Tracked caps marker, then a display line: *"This work is password protected."* |
| 3 | **Private-access explanation** | Generic copy stating the password applies to this work only **and is not an account** |
| 4 | **Persistent password label** | A real `<label for>` — never a placeholder standing in for a label |
| 5 | **One project-access password field** | ~22ch on the reading spine, so it does not read as a search bar |
| 6 | **Show / Hide control** | A real `<button type="button">` with `aria-pressed` |
| 7 | **Enter action** | A real `<button type="submit">` |
| 8 | **Closing line** | *"Access is granted for this work only."* |

**No project-specific content appears anywhere before authorization** — see
§6.5.

#### This is project access, not identity authentication **[INVARIANT]**

The candidate carries this in its own copy, not merely in its structure: the
explanatory line states the password **"is not an account."** The field is
`name="project-access"` — deliberately **not** `…password` — so nothing in the
DOM presents it as an account credential.

#### This is a candidate arrangement, not a universal template

The current desktop composition is **candidate evidence**, not a fixed template
and not an approved specification.

### 6.5 Non-disclosure **[INVARIANT — hard]**

**Before authorization the gate exposes zero project metadata.** This is not a
guideline and admits no exception.

**Independently audited against the prototype markup**, not taken on report:

| Forbidden before authorization | Verified |
|---|---|
| Title · synopsis · category · project-specific copy | **Absent** — every rendered string is route-independent |
| Image · poster · thumbnail · video · frame | **Zero** `img`, `video`, `svg`, `picture`, `source`, `canvas`, `iframe` elements; zero `background-image`; zero `url(`; zero `media/` references |
| Client · year · runtime · credits | **Absent** |
| Project-derived colour | **Absent** — the palette is the site's own, fixed |
| Protected-project theme inheritance | **Absent** — the surface is route-independent (§6.3) |

**No project object exists in the prototype**, and no project-specific media
dependency exists. There is no path by which project data could reach the
render.

The prototype enforces this with a **live vocabulary scan** over rendered text
on every state change, flagging any of *title, client, runtime, synopsis, credit,
year, poster* if it ever appears.

**[INVARIANT]** Both failure messages are identically generic, and **neither
confirms that a project exists at the route.**

**[INVARIANT]** The handoff reveals no project metadata before authorization
completes — nothing is prefetched.

### 6.6 The six visual states **[DEFAULT]**

| State | Contract |
|---|---|
| **Idle** | Empty field on a hairline, Enter available, no message |
| **Focused** | Visible focus outline; the persistent label remains |
| **Submitting** | Enter reads *Checking…*, `aria-busy="true"`; the field is **`readOnly`, never `disabled`**, so focus is kept; repeat submits are ignored at the handler |
| **Invalid** | Generic message, `aria-invalid="true"`, `aria-describedby` wired, value preserved, focus returned |
| **Rate limited** | Generic message in the same slot with the same treatment. **`aria-invalid` stays `false`** — the password was not judged wrong, the request was not judged at all |
| **Handoff** | Content out, surface to near-black, field and submit locked. No success message, no celebration, no metadata |

**[INVARIANT]** **The client never validates the password.** Typing after a
failure clears the visible message and returns to idle **without re-validating**
and without implying anything was checked.

**[INVARIANT]** **The client never counts attempts and never enforces rate
limiting.** Rate limiting is a server concern; this is only a visual contract for
a server response.

**[INVARIANT]** Rate-limit feedback is **generic**: no attempt count, no
threshold, no countdown, no hint about password correctness or project existence.

**[INVARIANT]** Duplicate submission is prevented both semantically and visually
— the handler returns early while submitting or handing off.

### 6.7 Accessibility and autocomplete **[INVARIANT]**

- Real `<form>`, `<input type="password">`, `<button type="submit">`.
- **Persistent visible label** bound by `for`/`id`. A placeholder never stands in
  for a label.
- The message carries `role="alert"` and is associated by `aria-describedby` in
  both failure states, removed otherwise.
- `aria-invalid` distinguishes the two failures honestly — `true` on invalid,
  `false` on rate limited.
- **Show / Hide is a real button** with `aria-pressed`, a label that changes, and
  focus returned to the field.
- Focus is a visible outline on every control, **never colour alone**.
- `autocapitalize`, `autocorrect` and `spellcheck` are **off** — a password typed
  on a phone must not be auto-capitalised or corrected.
- **Reduced motion makes the handoff immediate** and the state remains fully
  legible. Motion is never load-bearing.

#### `autocomplete="off"` **[DEFAULT]**

The candidate records `autocomplete="off"` with `name="project-access"`.

**The reasoning is behavioural, not merely semantic.** `current-password` is
defined as the password for *the account identified by the username field* —
there is no account and no username field here. More decisively: **several
private projects share one origin and each has a different password.** A password
manager keyed by origin would treat them as one credential and overwrite it each
time a different project is opened — actively harmful to a client holding two.
`new-password` was rejected separately, as it invites generation offers for a
password the visitor was given and cannot choose.

**Caveat, recorded as implementation behaviour and not a design blocker:** Chrome
and Safari apply heuristics to password inputs and may still offer to save
regardless of `off`. The design does not depend on the hint being honoured — it
must simply not *request* credential treatment.

**This is not account authentication, and `off` must not be reinterpreted as
such.**

### 6.8 Constraints

**[INVARIANT]** Rate-limited (`429`) · password never logged in plaintext ·
private projects emit `noindex, nofollow` · errors explain what to do next
without apologising or being vague.

### 6.9 Responsive **[RESPONSIVE VALIDATED — candidate]**

**Validated 2026-09-22.** Evidence:
`docs/design/prototypes/private-gate/Private Gate 5B Responsive.dc.html` and
`private-gate-5b-responsive.md`. **The desktop candidate 5B v2 is unchanged.**
**Six of the seven risks this section previously recorded are now answered by
measurement**; the seventh — item 7, *Show* control placement — was not
exercised and is carried below. The prediction record is kept in full.

Every derivation here is **[DEFAULT]** — one page's answer on one page's
evidence. It approves nothing and it is not a site-wide rule.

#### What this section predicted, and how each risk resolved

The seven risks recorded here before validation are preserved as the prediction
record. Six were exercised; one was not.

| # | Risk as recorded | Outcome |
|---|---|---|
| 1 | **Soft-keyboard overlap — the sharpest risk.** Content is vertically centred; with a keyboard open the field, message and *Enter* can all sit beneath it. | **Reproduced and measured.** *Enter* fell 20px below the fold at 375 × 307 with the invalid message shown. Answered by top-aligned flow below 620px |
| 2 | **Loss of vertical centring at constrained heights.** Centring almost certainly has to give way to top-aligned flow. | **Confirmed.** Centring was the mechanism of item 1, not a side effect. Top-aligned below 620px |
| 3 | **Field width.** The minimum measure is close to a small phone's usable width and may need revisiting. | **Confirmed and revised.** `22ch` alone resolved to 199px. Now `min(max(240px, 22ch), 100%)` |
| 4 | **Error wrapping**, which pushes the actions down while the keyboard is open. | **Exercised.** Both messages wrap to two lines at 375 inside a 40ch measure; neither pushes *Enter* off screen. Copy unchanged |
| 5 | **Nav compression** — full navigation on a page whose job is one field. | **Answered.** Public nav hidden at ≤430; the wordmark stays and *Back to works* is never removed |
| 6 | **Heading scaling** — fixed rather than container-relative, unlike the rest of the candidate set. | **Answered.** Now `clamp(26px, 8.2cqw of the spine, 46px)`, bounded by the desktop size |
| 7 | ***Show* control placement**, which may want to sit inline with the label at narrow widths. | **Not exercised.** Still open — see *Still open on this page* below |

#### Coverage

Six frames rendered simultaneously, each running the full six-state machine —
**IDLE · FOCUSED · SUBMITTING · INVALID · RATE LIMITED · HANDOFF**:

```text
768 × 1024   tablet, normal height
430 × 932    normal height
430 × 596    keyboard open, constrained height
390 × 844    normal height
390 × 400    keyboard open, constrained height
375 × 307    keyboard open, constrained height — worst case
```

A keyboard frame is short because the keyboard has taken the rest; what the
frame shows is what the visitor can reach without scrolling.

#### The observed failure — measured, not predicted

The soft-keyboard risk recorded as item 1 above was **reproduced and measured**.

At **375 × 307 with the invalid message shown**, *Enter* finished **20px below
the fold** and the content began to scroll. The submit control for a
single-field page was off screen at the exact moment the visitor most needs it
— immediately after a failed attempt, with the keyboard still open.

**The mechanism is vertical centring itself**: centring a growing form inside a
shrinking box pushes the bottom of the form off screen as soon as a message
appears. It is the cause, not a by-product.

Two further observations, both real if less acute:

- **`22ch` alone is too narrow a field.** At the responsive type size the
  measure resolved to **199px** — under a third of a 768 viewport, and cramped
  for typing a password with the characters hidden.
- **The first squeezed-tier threshold was wrong.** Set at `height < 360`, it
  left **390 × 400 with 11px of clearance** in the invalid state — technically
  reachable, effectively on the edge, and worse than the shorter 375 frame that
  did qualify.

#### Derivations **[DEFAULT — candidate]**

| Derivation | Rule |
|---|---|
| **Vertical alignment** | centred above **620px** available height; **top-aligned below** |
| **Constrained tier** | `height < 620` — reduced gaps; statement drops below 380 |
| **Squeezed tier** | `height < 430` — heading 21px, gaps 10–12px, footnote hidden |
| **Narrow tier** | `width <= 430` |
| **Field measure** | `min(max(240px, 22ch), 100%)` |
| **Heading** | `clamp(26px, 8.2cqw of the spine, 46px)`, −4px constrained, 21px squeezed |
| **Edge padding** | 56 → 32 (≤768) → 24 (≤430) |
| **Navigation** | full public nav hidden at ≤430; ***Back to works* is never removed** |

Each is computed from the frame's own width and height. Nothing is authored per
device, and none of it changes the page's meaning, hierarchy or order.

The squeezed threshold moved from 360 to **430 on evidence**: the boundary has
to sit above the tallest failing case, not at the shortest device. That took
390 × 400 from 11px of clearance to 61px.

#### Result — *Enter* clearance above the fold

| Viewport | Idle | Invalid | Rate limited |
|---|---|---|---|
| 768 × 1024 | 679px | 612px | 633px |
| 430 × 932 | 577px | 510px | 532px |
| 430 × 596 (kb) | 268px | 201px | 223px |
| 390 × 844 | 496px | 429px | 450px |
| 390 × 400 (kb) | 128px | **61px** | 83px |
| 375 × 307 (kb) | 96px | **29px** | 51px |

**No frame scrolls in any state.** *Back to works* sits 3–4px below *Enter* in
every case, so the escape route is reachable wherever the action is. The figures
are computed live from element geometry inside the prototype, not asserted.

#### States and semantics — re-verified at every width

- **INVALID and RATE LIMITED may wrap** — a 40ch measure, two lines at 375 — and
  **must not push *Enter* below the usable viewport**. Copy was not shortened to
  hide a layout problem. The rate-limit message stays visually quieter than the
  form it is about.
- **`aria-invalid` is `true` only for INVALID, and `false` for RATE LIMITED**
  (§6.7, unchanged). The password was not judged wrong; the request was not
  judged at all. Both are announced via `role="alert"` and referenced by
  `aria-describedby`.
- **Non-disclosure holds at every width** (§6.5, unchanged): zero media
  elements and no project object in either prototype.
- **`prefers-reduced-motion` sets the handoff transition to `0s`** in all six
  frames. State is carried by veil and content opacity, not by the animation, so
  the handoff is instantaneous and reads identically.

**Nothing was added to reach this**: no card, no modal, no sticky action bar, no
hamburger, no account UI, no new state (§6.2, §6.5 unchanged).

#### Real-device testing — outstanding, and does not block candidate status

**Simulated constrained height does not replace real-device testing.** A short
frame is a good proxy for an open keyboard; it is not iOS Safari. Before the
gate may be called done, implementation / QA must test at minimum:

- **iOS Safari**
- actual **`visualViewport`** behaviour
- software-keyboard **opening and closing**
- **focus retention** across those transitions
- **scrolling and reflow while INVALID and RATE LIMITED are visible**

This caveat does **not** block responsive *candidate* status. It blocks calling
the page finished.

#### Page-specific — do not promote **[DEFAULT]**

These are this page's answers on this page's evidence and are **not** site-wide
rules:

- the **≤430 navigation treatment**
- the **exact heading clamp values**
- the **exact field sizing values**
- the **exact constrained-height thresholds**, including the squeezed tier
- the statement / footnote drop order

Do not apply the gate's numbers to another page. The generalisable observations
are carried as evidence only, in `design-system.md` §11.6.

#### Still open on this page

1. ***Show* control placement** — item 7 above, not exercised by this
   validation. It may still want to sit inline with the label at narrow widths.
2. **Real-device validation**, above.
3. The three cross-cutting items in `design-system.md` §16 — display-coefficient
   convention (item 11), constrained-height behaviour (item 13) and site-wide
   mobile navigation (item 14). **None is this page's to settle.**

### 6.10 Unresolved — engineering and security

Carried forward without invented answers. **None is a Design decision**, and the
visual contract does not depend on any particular answer. **The responsive
validation in §6.9 changed none of them** — it introduced no new state, no new
route and no new client-side verification:

1. **Unknown-route vs private-route HTTP and routing behaviour.** The gate
   deliberately cannot tell a visitor whether they found a real private project
   or an unknown protected route; whether that holds end to end is a routing and
   status-code policy decision.
2. **Enumeration resistance.**
3. **Rate-limit thresholds** — window, per-IP vs per-route.
4. **Whether `Retry-After` is surfaced.** If a real countdown is ever provided
   the message slot can carry it; the design assumes none.
5. **Project-access cookie scope and lifetime.**
6. **Response timing parity between invalid and rate-limited outcomes.** The two
   are visually identical by design; engineering should confirm the *timing* does
   not leak what the copy withholds.

#### Design conflicts

**None open.** The theme-environment conflict was resolved on 2026-09-22 in
favour of a route-independent pre-auth surface (§6.3). **No visual-design
blocker remains.**

Responsive validation, which previously sat here as outstanding, is **done** —
the gate is RESPONSIVE VALIDATED — candidate (§6.9). What is left is
**real-device QA** (§6.9), the engineering / security questions above, one
page-level open item (*Show* control placement), and **approval**, which no
amount of validation supplies.

---

## 7. Cross-page invariants

Hold on every page regardless of exploration status.

| | |
|---|---|
| **Theme** | Light on Home, Art Works, About and Contact. **The pre-auth Private Gate is light** — a route-independent surface that inherits nothing from the project it guards (§6.3). **Authorized Project Detail is dark**, and owns all project-specific presentation. No visitor toggle. Polarity fixed. |
| **Chrome** | Navigation and footer are site chrome, outside the composer, on the same 12 columns as content. |
| **Media** | No card chrome. Full bleed by default. Native aspect except `VIDEO_GRID` and `HORIZONTAL_STRIP`. |
| **Video** | Never audible without user action. Multi-video surfaces are `AUTOPLAY_VISIBLE`. `AUTOPLAY_AMBIENT` only on a standalone ambient surface. |
| **Posters** | `poster_media_id → thumbnail_url → empty well`. Refused autoplay shows the poster. |
| **Motion** | Content moves; interface does not. One signature transition, shell-owned. |
| **Responsive** | Three breakpoints. Automatic safe stacking. **Every production page still requires a mobile design review.** One page is RESPONSIVE VALIDATED — the Private Project Gate (§6.9); the other five are pending, and must not borrow its derivations. |
| **Accessibility** | WCAG AA size-aware · visible focus · reduced motion yields a deterministic still · DOM order follows `position`, never `colStart`. |
| **Never** | Product UI, card primitives, feed-like surfaces, audible autoplay, invented compositions on pending pages. |

---

## 8. What must happen before implementation

1. **Approve or amend** `design-direction.md`, `design-system.md` and this
   document. All three are Draft.
2. ~~**Validate the gate at narrow widths**~~ — **done, 2026-09-22** (§6.9).
   The soft-keyboard overlap case was reproduced at 375 × 307, measured, and
   answered by derivation; the gate is **RESPONSIVE VALIDATED — candidate**.
   **What replaces it:** real-device QA on iOS Safari, `visualViewport`,
   keyboard open/close, focus retention, and reflow while INVALID and RATE
   LIMITED are visible (§6.9). That is an implementation/QA gate, not a design
   one. **The other five pages still need responsive validation.**
3. **Define narrow-width behaviour for `JUSTIFIED_ROWS`, `HORIZONTAL_STRIP` and
   `SLIDESHOW`.** The principle is approved (`design-system.md` §11.5) — GALLERY
   does not inherit GRID child stacking and every mode owes its own bounded
   behaviour. `VIDEO_GRID` already has one; the other three do not, and **Art
   Works cannot be specified at narrow widths until `JUSTIFIED_ROWS` does**
   (§2.7 item 3).
4. **Validate the HERO overlay's narrow-width fallback.** The capability is
   approved (ADR-0010) and requires the system to derive a stacked presentation;
   the breakpoint and its visual treatment still need mobile design validation
   (§3.9 item 1).
5. **Resolve the poster / film `fit` contract** (§3.9 item 2) together with the
   letterbox method — the two are coupled. ADR-0010 deliberately left it open.
6. **Resolve the letterbox method** (`design-system.md` §16 item 1) — it is an
   approved requirement with an unresolved method and it changes what the CMS
   must show.
7. **Apply the deferred schema work** from ADR-0006, ADR-0007 and ADR-0009 in
   one migration.
8. **Set the `VIDEO_GRID` column maximum** — validation cannot ship without a
   number.
