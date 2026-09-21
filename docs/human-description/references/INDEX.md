# Visual References — Index

**Precedence: Tier 2 — User-Provided Visual References** (CLAUDE.md §21).

These outrank human product intent and any external/general design guideline.
They are outranked only by an approved project-specific design specification.

No such specification exists yet. Per architect decision Q13, it will not be
authored until the external frontend-design guideline has been imported into
`docs/design/guidelines/` and reviewed **together with** these references.

---

## The image files are not in version control

> **If you are reading this in a fresh clone, the images described below are not
> present. You must restore them manually before doing any UI work.**

- The reference `.png` files are **intentionally not version-controlled**. They
  are excluded by `.gitignore`
  (`docs/human-description/references/*.png`).
- They are **required local design inputs**, not optional extras. They hold
  tier-2 design authority under CLAUDE.md §21 and outrank human product intent.
- **This file is the version-controlled manifest** that describes them. It is
  tracked; the images are not. The descriptions below are the only record of the
  references that travels with the repository.
- **A fresh clone will require the reference images to be restored manually**,
  from wherever the owner keeps them, into this directory, under the exact
  filenames listed below. The filenames are load-bearing — CLAUDE.md §21 refers
  to `5. horizontal-card-layout.png` by name when scoping what may be inherited
  from it.

Do not treat a missing image as permission to proceed without it, and do not
substitute a different reference. If an image is missing, ask the owner for it.

---

## Status of references 1–4 — visual direction, not a spec

Architect decision (Q3): references 1–4 are **visual direction / moodboard**
material. They are **not** an existing site to be reproduced pixel-for-pixel.

The design may evolve, but it must preserve these intended qualities:

- editorial
- cinematic
- media-first
- oversized typography where appropriate
- asymmetric composition
- strong filmmaking imagery
- the public site must not look like a SaaS product

---

## Reference inventory

### `1. About me.png` — 1597 × 1631

Owner identity / hero treatment for the About Me page.

- Oversized red serif `PORTFOLIO` wordmark, set larger than the viewport and
  allowed to clip at the edges; a second line repeats and is overlapped by the
  portrait.
- Off-white / bone ground. Near-monochrome apart from the single red accent.
- Portrait image overlaps the type rather than sitting beside it.
- Serif body copy in a narrow measure, lower-left.
- Small tool/credential badges as a footer row.

**Demonstrates:** oversized typography, type/image overlap, asymmetric
composition, restrained single-accent palette.

### `2. About me.png` — 1916 × 1679

About Me page, editorial long-form treatment.

- Thin hairline rectangles used as layout frames; frames deliberately overlap
  and break alignment.
- Serif heading `ABOUT ME`, serif body copy in a single narrow column.
- Scattered behind-the-scenes photo collage at mixed sizes and offsets — not a
  uniform grid.
- Near-white ground; imagery supplies all of the colour.

**Demonstrates:** editorial rhythm, asymmetric collage, generous whitespace,
hairline structural devices.

### `3. Works.png` — 3832 × 1245

Art Works index — dense cinematic still grid.

- Three rows, edge-to-edge, mixed aspect ratios within each row.
- Tight, even gutters; rows are not column-aligned with one another.
- Frames are dark and full-bleed; no cards, no shadows, no chrome.

**Demonstrates:** the `GRID` / `GALLERY` blocks, media-first density, mixed
aspect-ratio handling.

### `4. Works.png` — 3815 × 1767

Project detail page — mixed block composition.

- Full-bleed video player with an inline transport bar.
- Adjacent dark panel: serif title (`MADE TO MEASURE`), a small 2 × 3 thumbnail
  cluster, then body copy at small size.
- A second full-bleed video below, offset so the two do not align.

**Demonstrates:** `HERO` / `VIDEO` / `TEXT` / `GRID` blocks composed on one page;
**asymmetric composition** (see ADR-0004); a project page telling a specific
visual story rather than filling a fixed template.

### `5. horizontal-card-layout.png` — 3813 × 1871

> **Scope-limited reference.** Read architect decision Q2 before using this file.

Architect decision (Q2): this is a **layout / interaction reference only**.

**Inherit only:**

- the horizontal card / content strip
- layout rhythm
- the interaction and composition concept

**Do NOT inherit:**

- colour palette
- typography
- button styling
- branding tone
- visual identity

The source page is a branding-studio site in a warm cream palette with a rounded
display sans, a yellow pill CTA and informal copy. That visual language is
**out of scope** and directly contradicts references 1–4 and the brief's
"must not look like a SaaS product" requirement. Only the horizontally
scrolling strip of media cards carries over.

Renamed from `5..png` (malformed filename, no subject label) per Q2.

---

## Handling notes

- The five `.png` files are **local-only** and excluded from Git. See
  "The image files are not in version control" above.
- All five files are **screenshots**, not production assets. Three carry an
  "Activate Windows" watermark. None may be used as site imagery.
- `1. About me.png` renders a personal email address in-image. Review before
  this repository is given a public remote.
- Filenames 1–4 retain their original ordinals so they can still be referred to
  by number in conversation. Only reference 5 was renamed.
