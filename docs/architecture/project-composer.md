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

## 5. Phase 3B — authoring (implementation record)

Additive only: two migrations (`0007`, `0008`), three endpoints
(`openapi.yaml` 1.3.0), no change to any existing contract or public page.

- **Moving between containers.** `POST /blocks/{blockId}/move` moves a block
  between the owner's root and a top-level GRID, or between GRIDs, in one
  locked transaction. The source closes its gap and the target shifts right
  (ADR-0005 bounds). The block and its placements are revalidated in their
  new container. Leaving a GRID drops the grid `placement`. Preset GRIDs keep
  their own blocks, and the title-overlay HERO stays first. Migration `0007`
  adds a trigger so that a nested block's parent is always a top-level GRID,
  on insert and on move.
- **Studio moves.** Drag a block by its handle into or out of Columns. A drop
  zone appears at the end of the target, and a refused drop shows its reason
  in place. The equivalent for keyboard and touch is **Move to…** on the card.
  The rules live in `moves.ts` and mirror the service's. Chrome abandons a
  drag whose `dragstart` changes layout, so the other lists show their drop
  zones from the next task.
- **Rich text.** The TEXT editor has Emphasis (Ctrl+I) and Link (Ctrl+K)
  buttons and a live preview of what the page will show.
  `inline-markup.ts` converts between the block contract's inline runs and
  the editing notation (`*em*`, `[words](href)`, backslash escapes). Stored
  content is always runs, never notation. Text that does not parse cannot be
  saved. Links go to a site path, https or mailto only. There is no bold: the
  inline contract has only emphasis and links.
- **External video.** YouTube and Vimeo play in VIDEO blocks, a non-opening
  HERO, and GRID cells, always as CLICK_TO_PLAY.
  - `external-video.ts` reduces an address to the provider's id and builds
    the player address from that id alone: `youtube-nocookie.com/embed/…` or
    `player.vimeo.com/video/…?dnt=1`. These are the CSP's `frame-src`.
  - Nothing is requested from the provider before the visitor's click.
  - The Media Library refuses an address no player can show, and Publish
    refuses a stored one.
  - The opening plays hosted film only, and galleries refuse external video.
- **Private previews in the Studio.** `GET /media/{mediaId}/content` is for
  admins only and re-checked on every request. It answers with a short-lived
  signed redirect, or the streamed file for local storage, and is never
  cached. The Media DTO still has no `deliveryUrl` for a private asset.
- **ADR-0016 active picture.** `media.active_picture` (migration `0008`) holds
  2.39, 2.00, 1.85, or NULL for FULL, and is set in the Media Library. The
  Studio shades the bars on the preview and advises a clean re-export first.
  - The generic renderer frames each layer on its own asset's picture. The
    frame is a size container. The element keeps its file's proportions,
    sized so that the active rectangle covers the frame (or fits it, under
    CONTAIN), and the bars fall outside the frame.
  - Frames that follow their asset take the active picture's shape.
  - A choice that is not a letterbox of its file is refused at Publish.
- **Snapshot stability.** The new media fields are absent, not null, when
  unused. Every snapshot published before 3B therefore still equals its
  working copy: no project reports unpublished changes after the migration.
  This was checked on a restored production dump.

## 6. Not yet

- The locked opening, the presets and Home do not apply the active picture
  yet; setting one on an asset they use is a design review (ADR-0016 §4).
  The same holds for JUSTIFIED_ROWS.
- Video in JUSTIFIED_ROWS.
- Home as a free composer. Phase 3C composes Home from its closed sections
  (ADR-0018); generic blocks on Home await a design review.
- Bold text, which would be a contract change.
- Studio upload of private media: done in Phase 3C (ADR-0020,
  `content-system.md` §5).
