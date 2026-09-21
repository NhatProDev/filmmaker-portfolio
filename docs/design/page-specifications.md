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
| **Art Works** | **PARTIALLY EVIDENCED** | ✗ | ✅ ref 3 | A reference image and a data contract; no composition |
| **Project Detail** | **PARTIALLY EVIDENCED** | ✗ | ✅ ref 4 | A reference image and a playback contract; no composition |
| **About Me** | **PARTIALLY EVIDENCED** | ✗ | ✅ refs 1, 2 | Two reference images and a width-mode requirement; no composition |
| **Contact** | **STRUCTURALLY SPECIFIED** | ✗ | ✗ none | Scope and prohibitions only; no visual direction at all |
| **Private Project Gate** | **STRUCTURALLY SPECIFIED** | ✗ | ✗ none | An access contract and a stated design tension; no composition |

**Home is the only VISUALLY EXPLORED page.** No other page has one.

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

**Nothing here is approved.** Even Home's composition is a candidate derived
from a handoff whose prototype evidence is missing (`design-system.md` §0.1).

Worth noting the inversion: **Home is the only page that has been explored, and
the only page with no reference evidence.** The four pages with reference
evidence are the four that have not been explored. Exploration and evidence have
not yet met on any single page.

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

> **Maturity: PARTIALLY EVIDENCED.** Reference 3 only. **No composition has been designed.**
> **[PENDING VISUAL EXPLORATION]**

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

### 2.6 Constraints that hold regardless of composition

**[INVARIANT]** No card chrome. **[INVARIANT]** Native aspect preserved —
`JUSTIFIED_ROWS` is not an admitted uniform surface. **[INVARIANT]** Media-first;
the index is the work, not a list about the work. **[INVARIANT]** Any video
preview here is a multi-video surface → `AUTOPLAY_VISIBLE`, never
`AUTOPLAY_AMBIENT`.

### 2.7 Unresolved **[PENDING VISUAL EXPLORATION]**

Whether the index is `JUSTIFIED_ROWS`, `VIDEO_GRID`, or a switchable
presentation option · whether project titles and years appear at all, and where
· filtering or category affordances · pagination versus a single flow · the
hover/focus affordance given that hover lift is forbidden · mobile composition.

### 2.8 States

| State | Behaviour |
|---|---|
| **Empty** | No published public projects. **[PENDING]** — must be designed; an empty screen is an invitation to act, not a blank. |
| **Loading** | Posters first, as Home. |
| **Partial** | Some media not `READY` → empty wells in flow. |

---

## 3. Project Detail

> **Maturity: PARTIALLY EVIDENCED.** Reference 4 only. **No composition has been designed.**
> **[PENDING VISUAL EXPLORATION]**

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

### 3.5 Playback **[INVARIANT]**

**The primary film and ambient loops must not share a playback behaviour.**

| Surface | Mode |
|---|---|
| Primary project film | `CLICK_TO_PLAY` — real controls, real transport, audio available |
| Supporting loops, thumbnail clusters, galleries | `AUTOPLAY_VISIBLE` — muted |
| Anything inside a GRID or GALLERY | never `AUTOPLAY_AMBIENT` |

**[ADVISORY]** `CONTAIN` on the primary film — a film the visitor sits down to
watch is shown whole. `COVER` on browsing and preview surfaces.

### 3.6 Allowed patterns

**[INVARIANT]** Any canonical block type, any composer-valid arrangement, one
level of GRID nesting. **[DEFAULT]** Asymmetric media/text composition, media
wall, editorial text section, media caption.

### 3.7 Private projects **[INVARIANT]**

A PRIVATE project is reachable only by direct URL. Without a valid access cookie
the response is `403` carrying **no project content** — no title, cover,
description, blocks or media (ADR-0003). See §6.

### 3.8 Unresolved **[PENDING VISUAL EXPLORATION]**

Project metadata treatment — year, category, client, credits — and specifically
**how to present them without the middle-dot meta string** that §13 forbids ·
the transport/controls design for `CLICK_TO_PLAY` · credits block composition ·
next/previous project affordance, if any · mobile composition · how the
signature transition lands and reverses on this page.

### 3.9 States

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
2. **Explore the five pending pages.** Four have reference evidence that has
   never been taken into exploration.
3. **Resolve the letterbox method** (`design-system.md` §16 item 1) — it is an
   approved requirement with an unresolved method and it changes what the CMS
   must show.
4. **Apply the deferred schema work** from ADR-0006, ADR-0007 and ADR-0009 in
   one migration.
5. **Set the `VIDEO_GRID` column maximum** — validation cannot ship without a
   number.
