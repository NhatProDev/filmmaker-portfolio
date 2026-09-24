# Project Detail composer — implementation record (Phase 3A)

- **Status:** Implementation record. It implements ADR-0006, ADR-0008,
  ADR-0010, ADR-0011, ADR-0013 and ADR-0015 for Project Detail and decides
  nothing those ADRs did not approve. No schema change; additive API changes
  only (`openapi.yaml` 1.2.0).

## 1. Rendering

```text
stored blocks → snapshot (publish) → project-blocks.ts → ProjectPage.blocks → ProjectDetailView
```

- `src/features/site-content/project-blocks.ts` projects any valid
  composition of the seven block types, in stored order, into the renderer's
  view model. Media, contextual alt (placement → asset → decorative), the
  poster chain (placement → asset → empty frame) and playback precedence
  (item → block → surface default) are resolved there.
- **Presets** (`presets.ts`, ADR-0013 §2) keep their child contracts and are
  drawn with the locked `project.module.css`, unchanged. A preset is valid only
  on its own kind of page and only at the top level.
- **Everything else renders by type** (`blocks.module.css`) in the page's own
  tiers, 12 columns, type values and dark room. GRID placement is logical
  columns turned into custom properties; tablet derives from desktop and
  phones stack in document order unless overridden — all in CSS, never stored.
- **The opening.** Every Project Detail page opens with its title. The
  title-overlay HERO must be first; a composition without one opens on the
  project's cover. An empty composition shows the identity: cover and facts.
- **Refusal, not repair.** Anything the renderer cannot draw faithfully — an
  empty container, a block without media, a video in justified rows, external
  video (no public player in V1), a Home preset — is refused with the reason
  at Publish and in preview. Hidden blocks are never published.
- **Parity.** The committed content and every imported project render
  byte-identically to the pre-3A template (route, 404, navigation, private and
  preview fingerprints; server markup). The static adapter serves the same view
  model (`static-project-blocks.ts`).

## 2. Templates

`templates.ts`: Film first, Stills first, Editorial, or empty. Copied once in
the create transaction (`template-seeding.ts`), never linked. Seeds carry no
media and no copy; incomplete scaffolding is created hidden, so a new project
is publishable once it has its cover and year.

## 3. Studio composer

`src/app/admin/(studio)/projects/[projectId]/composer/`:

- **Outline** of cards: handle, position, thumbnails, label, summary, state
  (Hidden, what the block still needs), actions (move, duplicate, hide/show,
  delete with confirmation, insert below).
- **Reorder**: drag by the handle; or focus the handle, Space to pick up,
  arrows to move, Space to drop, Escape to cancel (announced); or the move
  buttons. One request with the complete container order (ADR-0002). The
  opening is pinned first.
- **Insert**: presets (arrive whole — `POST …/blocks` with `children`, one
  transaction) and generic blocks; text is written before it is created.
- **Edit**: per type — text and roles, media placement with contextual alt and
  placement poster, framing, playback (AMBIENT only where standalone), gallery
  mode and video-wall columns, spacer size, and GRID placement as a 12-column
  span per breakpoint with alignment.
- **Nesting**: one level. Only a top-level GRID holds children; the Studio
  offers leaf types only, and the API, the block contract and the database
  refuse anything deeper.
- **Preview**: the real public page (draft mode + admin session) in a frame at
  desktop, tablet or phone width, scaled to fit; reloads after every change.
  A never-published project can be previewed (the proxy lets a verified admin
  preview through).
- **Publishing**: Draft / Published — up to date / Published — with
  unpublished changes; reasons name blocks by label.

## 4. Fixes found on the way

- `frame-src` needs `'self'` for the preview frame (2G-A policy).
- Revalidation after a change targets Home, Art Works, every Project Detail
  page and the sitemap instead of the whole tree, which also invalidated the
  prerendered 404 (see `publishing-and-private-access.md` §2).

## 5. Not in this phase

Moving a block into or out of a GRID (delete and re-create instead); inline
emphasis/link editing (kept when present, plain text when edited); a public
player for EXTERNAL_VIDEO; video in JUSTIFIED_ROWS; the letterbox active area
(ADR-0016); Home as a free composer.
