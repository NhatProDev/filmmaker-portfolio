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

| Page | Maturity | Exploration | Reference | What exists |
|---|---|---|---|---|
| **Home** | **VISUALLY EXPLORED** | ✅ candidate | ✗ none | A proposed default composition, block by block |
| **Art Works** | **VISUALLY EXPLORED** | ✅ candidate (2C v2) | ✅ ref 3 | A proposed structure, element by element |
| **Project Detail** | **VISUALLY EXPLORED** | ✅ candidate (1B v2) | ✅ ref 4 | A proposed composition, block by block |
| **About Me** | **PARTIALLY EVIDENCED** | ✗ | ✅ refs 1, 2 | Two reference images and a width-mode requirement; no composition |
| **Contact** | **STRUCTURALLY SPECIFIED** | ✗ | ✗ none | Scope and prohibitions only; no visual direction at all |
| **Private Project Gate** | **STRUCTURALLY SPECIFIED** | ✗ | ✗ none | An access contract and a stated design tension; no composition |

**Three pages are VISUALLY EXPLORED — Home, Art Works and Project Detail.** None
is approved. The other three have no exploration.

### What each grade permits

| Grade | Means | An implementer may |
|---|---|---|
| **VISUALLY EXPLORED** | A composition has been built and reviewed as a candidate. Still **not approved**. | Build the proposed composition, treating it as a default arrangement, not a template |
| **PARTIALLY EVIDENCED** | A visual reference exists, but **no composition has been designed from it**. | Apply the constraints and the reference's evidenced qualities. **Not** invent a final composition |
| **STRUCTURALLY SPECIFIED** | Scope, contracts and prohibitions are settled. Visual design has not begun. | Implement the contract. **Not** design the page |
| **PENDING VISUAL EXPLORATION** | Marks a specific unresolved item inside any page above. | Stop and raise it |

**A reference image is not a design.** References 1–4 show *qualities* — an
oversized clipped wordmark, hairline frames, a justified still grid, an
asymmetric video panel. They do not specify page structure, navigation, states,
responsive behaviour or media configuration. Treating a reference as a finished
design for its page is the specific failure this table exists to prevent.

**Nothing here is approved.** All three explored candidates are recorded in
`docs/design/prototypes/`, and every prototype states in its own header that it
approves nothing. None has Project Owner / Architect approval.

Worth noting how the evidence now sits: **Home has been explored but has no
reference evidence; Art Works and Project Detail have both.** Exploration and
reference evidence have now met on two of the six pages. **About Me** still holds
reference evidence that has never been taken into exploration; Contact and the
Private Project Gate have neither.

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

> **Maturity: PARTIALLY EVIDENCED.** References 1 and 2 only. **No composition has been designed.**
> **[PENDING VISUAL EXPLORATION]**

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

### 4.5 The About portrait — width mode **[INVARIANT]**

The About portrait is the **motivating case for width mode**
(`design-system.md` §5.3).

Under safe mobile stacking it would go to full width and become a profile photo
rather than an editorial portrait. **Width mode lets it stay deliberately
narrower than its container after stacking.** This is why width mode is required
rather than optional.

### 4.6 Constraints

**[INVARIANT]** Reading measure ≤ 46ch · negative space is load-bearing and must
not be backfilled · no card chrome · the oversized display gesture is permitted
here and is one per view.

### 4.7 Unresolved **[PENDING VISUAL EXPLORATION]**

Whether About uses the hairline-frame device from reference 2, the overlap
device from reference 1, or both · portrait treatment and placement · whether
tool/credential badges appear · how the collage composes responsively · mobile
composition.

**Content blocker:** the current About portrait asset is **a crop out of a
screenshot and is soft at display size**. A master file is outstanding.

### 4.8 States

Static content; no loading, empty or error states beyond the media well.

---

## 5. Contact

> **Maturity: STRUCTURALLY SPECIFIED.** No exploration, no reference. **Visual design has not begun.**
> **[PENDING VISUAL EXPLORATION]**

### 5.1 Purpose

Let someone make contact. Nothing more.

### 5.2 Composer status **[INVARIANT]**

**Static in V1.** No contact API, no persistence table, no email provider, no
spam system (CLAUDE.md §19).

It may contain an email / `mailto:` link, social links, and other public contact
information.

### 5.3 Theme environment **[INVARIANT]**

**Light.**

### 5.4 Constraints

**[INVARIANT]** Not a form, not a product page, no SaaS CTA treatment.
**[DEFAULT]** The email is one of the three admitted accent uses.
**[INVARIANT]** Plain language, active voice; a control names what it does.

### 5.5 Unresolved **[PENDING VISUAL EXPLORATION]**

Entire composition. Whether Contact is a page or a section of About. Whether the
oversized display gesture appears here. Mobile composition.

**Do not invent a Contact composition during implementation.**

---

## 6. Private Project Gate

> **Maturity: STRUCTURALLY SPECIFIED.** No exploration, no reference. **Visual design has not begun.**
> **[PENDING VISUAL EXPLORATION]**

### 6.1 Purpose

Take a project password from a visitor who already holds the direct URL, and let
them in.

### 6.2 Access model **[INVARIANT]**

Per ADR-0003: a PRIVATE project is **not enumerated anywhere public**. The
visitor arrives with the URL. Without a valid access cookie, `GET` returns `403`
with an error envelope and **no project content**. The visitor submits the
password; the server verifies and sets a signed HTTPOnly cookie.

**[INVARIANT]** This is **not account authentication.** There is no account.

Forbidden: "Sign in" · a username or email field · "Forgot password" · "Create
account" · any account framing whatsoever.

### 6.3 Theme environment **[INVARIANT]**

**Dark** — the gate inherits the environment of the project it guards. The
visitor is already at the cinema door.

### 6.4 Design intent **[DEFAULT]**

**A title card, not a login screen.** The project's own environment, a single
field, a plain instruction.

**[INVARIANT]** It must reveal nothing about the project it guards beyond what
the visitor already has — no title, cover, description or credits before access
is verified.

This creates a genuine and unresolved design tension: the gate must feel like it
belongs to a specific project while being forbidden from showing anything about
that project. **[PENDING VISUAL EXPLORATION]**

### 6.5 Constraints

**[INVARIANT]** Rate-limited (`429`) · password never logged in plaintext ·
private projects emit `noindex, nofollow` · errors explain what to do next
without apologising or being vague.

### 6.6 States

| State | Behaviour |
|---|---|
| **Locked** | The gate. Password field, plain instruction. |
| **Wrong password** | `401`. **[PENDING]** — must say what to do next, in the interface's voice, without apology. |
| **Rate limited** | `429`, with `Retry-After` when known. **[PENDING]** |
| **Unlocked** | Access cookie set; the project renders normally. **[PENDING]** — whether the transition plays here is undesigned. |
| **Not found** | `404`. Must not disclose whether a private project exists at that slug. |

---

## 7. Cross-page invariants

Hold on every page regardless of exploration status.

| | |
|---|---|
| **Theme** | Light on Home, Art Works, About, Contact. Dark on Project Detail and the gate. No visitor toggle. Polarity fixed. |
| **Chrome** | Navigation and footer are site chrome, outside the composer, on the same 12 columns as content. |
| **Media** | No card chrome. Full bleed by default. Native aspect except `VIDEO_GRID` and `HORIZONTAL_STRIP`. |
| **Video** | Never audible without user action. Multi-video surfaces are `AUTOPLAY_VISIBLE`. `AUTOPLAY_AMBIENT` only on a standalone ambient surface. |
| **Posters** | `poster_media_id → thumbnail_url → empty well`. Refused autoplay shows the poster. |
| **Motion** | Content moves; interface does not. One signature transition, shell-owned. |
| **Responsive** | Three breakpoints. Automatic safe stacking. **Every production page still requires a mobile design review.** |
| **Accessibility** | WCAG AA size-aware · visible focus · reduced motion yields a deterministic still · DOM order follows `position`, never `colStart`. |
| **Never** | Product UI, card primitives, feed-like surfaces, audible autoplay, invented compositions on pending pages. |

---

## 8. What must happen before implementation

1. **Approve or amend** `design-direction.md`, `design-system.md` and this
   document. All three are Draft.
2. **Explore the three pending pages.** About Me holds reference evidence that
   has never been taken into exploration; Contact and the Private Project Gate
   have no evidence at all.
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
