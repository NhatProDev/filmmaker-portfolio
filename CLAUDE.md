# CLAUDE.md — Filmmaker Portfolio V1

## 1. Role

You are implementing an existing architecture, not inventing a new product architecture.

The human owner acts as Product Owner / Software Architect / Tech Lead. Preserve the locked decisions below unless the owner explicitly approves a change.

If a requirement conflicts with the current architecture:

1. Stop changing architecture silently.
2. Explain the conflict.
3. Propose the smallest viable change as an ADR-style note.
4. Wait for explicit approval before changing a locked contract.

Do not rewrite the schema or REST contract merely because another approach is easier to implement.

---

## 2. Product

Professional filmmaker portfolio with:

- Home
- Art Works
- About Me
- Contact
- Public project pages
- Password-protected private project pages
- Admin CMS
- Project CRUD
- Media Library
- Albums and collections (ADR-0019)
- Responsive Visual Layout Composer (block-based, grid-composed, drag-and-drop)

The composer is how the administrator builds both project pages and the Home
page without a developer. See §13.

Public visitors do not have accounts and never need to log in.

Only admins authenticate.

A private project is unlocked with a project-specific password; that password is not a user account.

---

## 3. Locked Architecture

- Architecture: modular monolith
- Frontend/full-stack framework: Next.js
- Language: TypeScript
- API: RESTful, versioned under `/api/v1`
- Database: PostgreSQL
- ORM: Drizzle ORM
- Validation: Zod
- Database IDs: UUID
- JSON API naming: camelCase
- Database naming: snake_case
- Project page architecture: block based
- Ordering: integer `position`, updated transactionally
- Insertion: `position` optional; omitted appends; supplied inserts and shifts siblings right
- Media: reusable Media Library
- Large uploads: browser-to-object-storage using signed upload authorization
- Private project access: password verification on server + signed HTTPOnly cookie
- Public user accounts: none
- Project deletion: soft delete
- Media deletion: soft delete
- Page building: Responsive Visual Layout Composer — structured data + visual
  drag-and-drop + responsive grid layout
- Layout grid: logical 12-column desktop model; no pixel coordinates
- Breakpoints: a fixed set (desktop, tablet, mobile); admins cannot create new ones
- Video playback: one discriminated mode (CLICK_TO_PLAY / AUTOPLAY_VISIBLE /
  AUTOPLAY_AMBIENT); autoplay is always muted; derived flags are never inputs
- Video concurrency: system-bounded, not administrator-configurable
- Absolute-position / Figma-style freeform canvas: out of V1 scope

These last two lines are distinct and must not be collapsed. V1 **does** support
flexible responsive visual composition. V1 **does not** support a freeform
absolute-position canvas. See §13 and ADR-0006.

Do not split the V1 backend into independent Express/NestJS/microservices without explicit approval.

---

## 4. Layering Rules

Required flow for API-backed operations:

```text
HTTP Route Handler
    -> validation/auth boundary
    -> Service
    -> Repository
    -> PostgreSQL
```

Responsibilities:

### Route Handler

- parse HTTP request
- authenticate/authorize
- validate request with Zod
- call application service
- map known errors to HTTP status codes
- return DTO

Route handlers must not contain substantial business logic or raw SQL.

### Service

- business rules
- transaction boundaries
- publication rules
- private-project rules
- ordering/reordering logic
- cross-repository coordination

Services must not construct HTTP responses.

### Repository

- database persistence
- Drizzle queries
- database records

Repositories must not make authorization decisions or return HTTP responses.

### DTO / Mapper

Database rows must not be returned directly from public/admin HTTP endpoints.

Map persistence records to explicit DTOs.

Never expose:

- `password_hash`
- signing secrets
- database URLs
- storage secrets
- internal-only fields

---

## 5. Domain Boundaries

Keep these modules distinct:

```text
projects
media
project-builder
authentication
project-access
```

Suggested structure:

```text
db/                          # repository root, NOT src/db — see §6 and ADR-0001
  schema.ts
  migrations/
  client.ts

src/
  app/
    (public)/
    admin/
    api/v1/

  features/
    projects/
      project.service.ts
      project.repository.ts
      project.schema.ts
      project.types.ts
      project.mapper.ts

    media/
    project-builder/
    authentication/
    project-access/

  lib/
    auth/
    storage/
    validation/
    errors/

  components/
    ui/
    layout/
    media/

scripts/
  seed-admin.ts              # creates the initial admin from env vars — see §11
```

`db/` lives at the repository root, not under `src/`. This resolves a former
contradiction between this section and §6. Root-level `db/` is canonical.

Do not create generic abstractions until at least two real consumers justify them.

---

## 6. Database Rules

Canonical schema: `db/schema.ts` (repository root, not `src/db/`).

Initial SQL migration: `db/migrations/0001_initial.sql`. Later migrations are
generated by drizzle-kit from `db/schema.ts` and are additive; `0001` carries no
semantic DDL change, ever (ADR-0015 §3).

Both paths are relative to the repository root. See ADR-0001.

Core tables:

- `admin_users`
- `projects`
- `pages`
- `project_blocks`
- `block_media`
- `media`
- `page_media` (ADR-0017)
- `albums`, `album_media` (ADR-0019)
- publication tables: `project_publications`, `page_publications`,
  `album_publications`, `publication_media` (ADR-0012)

Relationships:

```text
PROJECT 1:N PROJECT_BLOCK         (root blocks)
PAGE 1:N PROJECT_BLOCK            (root blocks; Home — ADR-0007)
PROJECT_BLOCK 1:N PROJECT_BLOCK   (GRID children, one level — ADR-0006)
PROJECT_BLOCK 1:N BLOCK_MEDIA
MEDIA 1:N BLOCK_MEDIA
PROJECT N:1 MEDIA (optional cover; optional preview — ADR-0011)
MEDIA N:1 MEDIA (optional default poster — ADR-0009)
BLOCK_MEDIA N:1 MEDIA (optional placement poster — ADR-0015)
PAGE 1:N PAGE_MEDIA N:1 MEDIA     (About/Contact slots — ADR-0017)
ALBUM 1:N ALBUM_MEDIA N:1 MEDIA   (ADR-0019)
ALBUM N:1 MEDIA (optional cover); ALBUM N:1 PROJECT (optional, live — ADR-0019)
```

`PAGES.content` holds a keyed page's structured editorial content (ABOUT,
CONTACT, SITE), validated by a strict per-key schema; it never holds media ids,
colour, typeface or layout values (ADR-0017).

`PROJECT_BLOCK.config` and `BLOCK_MEDIA.config` hold presentation configuration only.

Do not move canonical media relationships into JSON config.

Grid placement (column start, span, alignment, per-breakpoint overrides) **is**
presentation configuration and belongs in `config`, under an explicitly
validated schema per block type (§14) — never as a free-form object.

Structural relationships are **not** configuration. Block nesting and page
ownership are relational, not JSON: a self-referencing `parent_block_id` for
nesting and a `page_id` owner so Home can be composed, both applied in migration
`0002` (ADR-0006, ADR-0007). A block has exactly one owner, strictly: a root
block names exactly one of project or page and has no parent; a child names only
its parent (ADR-0013 §3, ADR-0015 §2). Never embed any of these ids in `config`.

A `PRIVATE` project must have a password hash.

Project visibility and publication status are separate concepts.

Publicly retrievable project content requires:

```text
status = PUBLISHED
AND deleted_at IS NULL
```

The public **listing** additionally requires `visibility = 'PUBLIC'`:

```text
status = PUBLISHED
AND deleted_at IS NULL
AND visibility = 'PUBLIC'
```

PRIVATE projects are never enumerated publicly in V1. They are reachable only by
their direct project URL, where the visitor supplies the project password. No
field of a PRIVATE project — including its cover media, short description, year
or category — may appear in a public listing before access is verified.
See ADR-0003.

Private project blocks/media must not be returned until project access is verified.

---

## 7. Ordering / Drag-and-Drop

V1 uses integer positions:

```text
0, 1, 2, 3, ...
```

Six collections are reorderable:

```text
projects (display order)      PUT /api/v1/projects/order
projects (featured order)     PUT /api/v1/projects/featured/order
blocks within a container     PUT /api/v1/projects/{projectId}/blocks/order
media within a block          PUT /api/v1/blocks/{blockId}/media/order
albums (display order)        PUT /api/v1/albums/order                 (ADR-0019)
images within an album        PUT /api/v1/albums/{albumId}/media/order (ADR-0019)
```

### Ordering scope under the composer

The composer introduces **one** new ordering concept, and only one: block
ordering is scoped to a **container**, not to a project.

```text
container = the page or project root, OR a parent GRID block
```

`position` remains a contiguous integer sequence from 0 **within its container**.
Two blocks may share `position` 0 if they sit in different containers.

Everything else is unchanged. Media ordering within a block is unaffected.

**Grid placement is not ordering.** `colStart` controls where an item sits
visually; `position` controls document order. `position` determines DOM order,
which is also keyboard/screen-reader order and the mobile stacking order. Do not
conflate them, and do not derive one from the other.

The reorder endpoint's completeness rule (ADR-0002) becomes "the complete set of
blocks **in the target container**". See ADR-0006.

Reordering projects, blocks or media must use one API request and one database
transaction.

Do not make one HTTP mutation for every moved row.

`projects.display_position` and `projects.featured_position` are therefore **not
writable through `PATCH /api/v1/projects/{projectId}`**. The ordering endpoints
are their only write path. See ADR-0002.

### Insertion semantics

These rules govern creation, not reordering. They apply to:

```text
POST /api/v1/projects/{projectId}/blocks     siblings = blocks of the target container
POST /api/v1/pages/{pageKey}/blocks          siblings = blocks of the target container
POST /api/v1/blocks/{blockId}/media          siblings = block_media of that block
POST /api/v1/albums/{albumId}/media          siblings = album_media of that album
```

Let `N` be the number of existing siblings **before** the insert.

- `position` is **optional**.
- **Omitted** means append to the end — equivalent to `position = N`.
- `position` in `0..N` inserts at that position. `position = N` appends.
- Every existing sibling at `position >= p` **shifts right by one**.
- The insert and the shift happen in **one database transaction**.
- Final positions must be **contiguous from 0**, with no gaps and no duplicates.
- `position < 0` or `position > N` returns **`422 VALIDATION_ERROR`**.

A `position` beyond the end is an error, not a silent append. Clients that mean
"append" omit the field.

An insert that fails must leave no shifted siblings committed, per §15.

See ADR-0005.

Do not introduce LexoRank/fractional indexing in V1 unless a demonstrated concurrency/performance need exists.

V1 does not support realtime collaborative editing.

---

## 8. REST Contract

Canonical contract: `openapi.yaml`.

Do not introduce unversioned API routes for V1 domain functionality.

Use resource-oriented routes and explicit domain actions where CRUD is not expressive enough.

Examples:

```text
GET    /api/v1/projects
POST   /api/v1/projects
PATCH  /api/v1/projects/{projectId}

POST   /api/v1/projects/{projectId}/publish
POST   /api/v1/projects/{projectId}/unpublish

PUT    /api/v1/projects/order
PUT    /api/v1/projects/featured/order
PUT    /api/v1/projects/{projectId}/blocks/order
PUT    /api/v1/blocks/{blockId}/media/order
```

JSON responses use camelCase.

Database columns use snake_case.

---

## 9. Error Contract

Use a stable error envelope:

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found",
    "details": null
  }
}
```

Validation failures use `VALIDATION_ERROR` and may include field-level details.

Do not leak stack traces or internal provider errors to clients in production.

---

## 10. HTTP Semantics

Use these semantics consistently:

- `200 OK` successful read/update
- `201 Created` successful creation
- `204 No Content` successful action/delete where no body is needed
- `400 Bad Request` malformed request
- `401 Unauthorized` missing/invalid authentication or wrong project password
- `403 Forbidden` authenticated/request understood but access not granted; also locked private project reads
- `404 Not Found` resource absent or intentionally hidden
- `409 Conflict` valid request conflicts with resource state
- `422 Unprocessable Entity` domain/validation rule prevents operation
- `429 Too Many Requests` rate limit
- `500 Internal Server Error` unexpected server failure

---

## 11. Authentication vs Project Access

These are separate security contexts.

### Admin authentication

Protects CMS and admin mutations.

Use a secure HTTPOnly session cookie.

### Admin provisioning

There is no public admin registration endpoint, and none may be added.

The initial admin is created out-of-band by `scripts/seed-admin.ts`
(`npm run db:seed-admin`), which reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from
environment variables. Re-running it for an existing email replaces the password
and revokes that admin's sessions. Sessions are server-side and revocable
(`admin_sessions`, token stored as a SHA-256 hash).

### Private project access

A visitor submits a project password.

Server verifies hash and grants temporary project-specific access using a signed HTTPOnly cookie/session claim.

Do not treat project passwords as admin/user login credentials.

Do not expose password hashes to the browser.

Rate-limit password attempts.

---

## 12. Media Rules

Large images/videos must not be proxied through the Next.js application server when direct signed upload is available.

Expected flow:

```text
Browser
  -> POST upload authorization
API
  -> signed upload URL
Browser
  -> object storage directly
Browser/API
  -> complete/finalize media record
```

Media deletion must fail with `409 MEDIA_IN_USE` while referenced by a project
cover or preview, a block placement, a placement poster, an asset's default
poster, a page media slot (ADR-0017), an album item or cover (ADR-0019), or
(ADR-0012) a current published snapshot.

Uploads choose an audience (ADR-0020). A PRIVATE original lives under
`private/`, has no public URL, and is delivered only through signed,
short-lived, access-checked routes.

The in-use check inspects **relational** references only. A media id hidden in a
`config` object is invisible to it, which is one reason §6 forbids putting media
relationships in JSON.

### Poster frames

Administrator-selected poster media is a **V1 requirement** (ADR-0009, amended
by ADR-0015).

```text
block_media.poster_media_id  →  media.poster_media_id  →  thumbnail_url  →  empty media well
   (placement override)          (asset default)          (generated/provider)
```

The default poster is a property of the **asset**, held relationally as
`media.poster_media_id`. A placement may override it with
`block_media.poster_media_id` where one clip deliberately shows a different
still in a different context. Neither is ever an id inside `config`. Both
**participate in `MEDIA_IN_USE`**: an image used as any poster cannot be deleted.

### Baked-in letterbox

Some source assets carry letterbox bars baked into the frame — 2.34:1 or 2.0:1
content inside a 16:9 file. Under `COVER` these render as black bars *inside* the
composed frame.

**The production ingestion/media pipeline must solve this structurally.**
One-off CSS scaling is not an acceptable production solution and must not ship.

**The method is decided by ADR-0016:** clean masters first (upload the active
picture, without bars); for a file that cannot be re-exported, a stored,
closed-enum active area on the asset, applied by the renderer to each layer from
its own asset; no automatic detection in V1. It is implemented (Phase 3B,
migration `0008`: `media.active_picture`) for surfaces drawn by the generic
block renderer, and since Phase 3D for `JUSTIFIED_ROWS` in project galleries
and albums. The locked opening, presets and Home (including its frames) still
render assets as encoded; applying it there is a design review (ADR-0016
Decision 4).

Whichever method is chosen must apply **identically to a poster and its video**,
or the poster-to-video swap produces a visible scale jump (ADR-0009 §5).

Deleting a block deletes only the `block_media` references, not the Media Library asset.

Storage provider logic belongs behind an infrastructure abstraction; domain services should not depend on Cloudinary/S3-specific response shapes.

---

## 13. Layout Composer Rules

V1 ships a **Responsive Visual Layout Composer**. The administrator composes
public pages visually, without code.

The model is:

```text
structured data  +  visual drag-and-drop  +  responsive grid layout
```

It is **not** arbitrary pixel positioning and **not** a Figma-style canvas.

### Block types

- HERO
- TEXT
- IMAGE
- VIDEO
- GRID
- GALLERY
- SPACER

This list is closed. Do not add a block type to satisfy a layout requirement.
There are no arbitrary-HTML, custom-code or embed blocks in V1.

### Composer capabilities

The composer must support, at minimum:

- create block
- delete block
- duplicate block
- drag to reorder blocks
- hide / show block
- configure block presentation

### HERO — bounded title overlay

A **project-owned** HERO may carry a bounded title overlay inside its own frame
(ADR-0010). This is **intra-block presentation**, not nesting and not the
deferred GRID inter-child overlap primitive. HERO remains a leaf block.

- The title resolves from **`projects.title`**. It is **never authored in block
  config**, and no other text may be placed in the overlay.
- An optional navigation line (e.g. "Back to Works") is **system/route-derived**.
- Placement uses a closed anchor enum plus the existing 12-column vocabulary.
- **Scrim, typography, colour, z-order, dismissal and the responsive fallback
  are derived by the system**, never authored.
- Valid only on an `IMAGE` HERO or a `CLICK_TO_PLAY` video HERO. **Not valid on
  `AUTOPLAY_AMBIENT` or `AUTOPLAY_VISIBLE`.**
- Dismissal is defined against **media activation** — the user act that starts
  the media — never against an observed playback event. For `EXTERNAL_VIDEO`
  the overlay is dismissed *before* handing off to the provider embed.
- On an `IMAGE` HERO there is no activation; the overlay remains visible.
- The overlay must never obstruct the play affordance, native or provider
  transport, or any focus target. The navigation line needs a visible focus
  state.
- At narrow widths the system **derives** a stacked presentation — HERO, then
  title and navigation in document flow. A second mobile composition must not be
  stored in config.

No body copy, no second text region, no arbitrary HTML, no z-index authoring, no
coordinates.

### GRID — responsive column composition

**GRID is no longer limited to a closed set of named presets.** It is a
responsive column-composition container. This supersedes the preset-only
constraint in ADR-0004; see ADR-0006.

- Placement uses a **logical column system**, never pixel coordinates.
- **12 columns** is the desktop conceptual model.
- A GRID contains ordered **child blocks**. Each child declares its own
  placement: column start, column span, order, alignment, vertical alignment,
  gap, width mode, and full-bleed/contained behaviour where applicable.
- Children may be leaf blocks (HERO, TEXT, IMAGE, VIDEO, SPACER). **A GRID may
  not contain a GRID or a GALLERY.** Nesting depth is exactly one level.
- **Presets remain available as starting points, not as the only permitted
  configurations.** An administrator may compose an arbitrary valid column
  arrangement without a developer adding a preset.

This is what makes deliberately asymmetric editorial composition possible.

### GALLERY stays distinct from GRID

Do not merge them. They are different semantics.

- **GALLERY** — **automatic** media flow: a rule arranges an ordered sequence.
- **GRID** — **deliberate manual** composition: specific items placed in
  specific places.

GALLERY presentation modes (semantics locked, names may be refined):

```text
JUSTIFIED_ROWS    HORIZONTAL_STRIP    SLIDESHOW    VIDEO_GRID
```

`VIDEO_GRID` is a multi-video wall — a column flow configured per breakpoint,
for example 4 / 2 / 1 columns across desktop / tablet / mobile. **Do not merge
`VIDEO_GRID` with GRID**, and do not add a block type for it. See ADR-0008.

GALLERY may contain **IMAGE and VIDEO together**. The presentation mode decides
whether mixing is sensible, not whether it is permitted.

### Multi-video composition

Both capabilities exist and must remain distinct:

- **Manual video layouts belong to GRID.** A GRID may contain multiple VIDEO
  children alongside IMAGE and TEXT, each with its own span and placement. This
  needs no new block type — it already follows from the composer model.
- **Automatic video flow belongs to GALLERY / `VIDEO_GRID`.**

### Video playback contract

Playback is **one discriminated mode**, not a set of booleans:

```text
CLICK_TO_PLAY      AUTOPLAY_VISIBLE      AUTOPLAY_AMBIENT
```

| Mode | Use for |
|---|---|
| `CLICK_TO_PLAY` | Primary project film; anything where audio is intended |
| `AUTOPLAY_VISIBLE` | **Default for every multi-video surface** — walls, grids, previews |
| `AUTOPLAY_AMBIENT` | **Exceptional, standalone ambient video only** — e.g. a single Home hero |

`autoplay`, `muted`, `playsInline`, `preload` and `pauseWhenOffscreen` are
**derived from the mode and are never configuration inputs**. This makes invalid
states unrepresentable rather than merely invalid.

Configuration precedence:

```text
per-item override (block_media.config)
  > block default (project_blocks.config)
    > mode default (system)
```

**`AUTOPLAY_AMBIENT` is restricted by context, not by count.** It is permitted
only on a small standalone ambient surface — a single Home hero, or a standalone
ambient VIDEO block.

It **must not** be used:

- by a VIDEO item **inside a GRID**
- by a **GALLERY**, in any presentation mode
- by **`VIDEO_GRID` items**
- as an **inherited block or gallery default** for a multi-item media surface

Multi-video compositions use `AUTOPLAY_VISIBLE` or `CLICK_TO_PLAY`. The rule is
decidable from the block's container alone — never by counting videos on a page.

**`EXTERNAL_VIDEO` media supports `CLICK_TO_PLAY` only.** Provider iframes give
no reliable control over autoplay, muting, pausing or posters.

### Autoplay safety

- Muted by default and **forced** muted in both autoplay modes.
- `playsInline` always.
- **No public page may initiate audible playback.** Audio requires a deliberate
  user act.
- Autoplay is a request that may be **refused**; a refused autoplay falls back
  to the poster frame, never a blank tile.
- `prefers-reduced-motion` yields a deterministic still — paused poster or cover
  image, not a slowed loop.
- Poster frames resolve placement poster → asset poster → `thumbnail_url` →
  empty well (§12, ADR-0009, ADR-0015). **Never store a media id in `config`** — §6 forbids it and it
  defeats the `MEDIA_IN_USE` guard in §12.

### Video performance

- Off-screen videos must not keep consuming playback resources in
  `AUTOPLAY_VISIBLE`.
- A video grid must not naïvely autoplay or decode an unbounded number of videos.
- Performance must remain acceptable on desktop **and** mobile.
- `VIDEO_GRID` column counts are bounded by validation at every breakpoint, and
  must fall at narrower breakpoints.

The runtime strategy is *visible: play · near viewport: prepare · far: pause and
release*. **The mechanism is deliberately unspecified** — `IntersectionObserver`
is an implementation detail and is not locked into the architecture.

**Concurrency is a system constant, not an administrator setting.** Do not
expose a configurable concurrency or preload budget in V1.

### Responsive model

Composition may be complex and asymmetric on desktop and must remain readable
everywhere.

- A fixed set of breakpoints: **desktop, tablet, mobile**. Administrators cannot
  create new breakpoints.
- **Desktop** carries the explicit composition.
- **Tablet** derives from desktop unless explicitly overridden.
- **Mobile** falls back to safe stacking — full-width, in `position` order —
  unless explicitly overridden.
- Derivation is **deterministic**. Never store arbitrary x/y pixel positions as
  the canonical layout model.

**A layout authored on desktop must never be broken or unreadable on mobile.**
Safe mobile stacking is the default precisely so this cannot happen by neglect.

### Page scope

- **Project detail** — composer-driven. Compositions may differ from project to
  project. This flexibility is a core product requirement.
- **Home** — composer-driven. Home is **not** a hard-coded template. Any Home
  design explored in Claude Design is a visual concept expressed as composer
  data, and the administrator must be able to reorder, replace, remove,
  duplicate or reconfigure its blocks without code changes. See ADR-0007.
- **Art Works** — data-driven and gallery-oriented. It may expose presentation
  options; do not turn it into a free page builder.
- **Home** is composed of Home's five closed sections only; generic blocks on
  Home await a design review (ADR-0018).
- **About Me** and **Contact** — CMS-managed **structured** content (ADR-0017),
  not composer pages. Their locked layouts render typed fields and media slots;
  do not convert them into block compositions. Contact has no form.
- **Albums** — data-driven sequences of images (ADR-0019), not compositions.

### Layout and theme are orthogonal

Layout composition and the theme system are separate concerns and must not be
mixed.

- **Theme** controls typography and palette.
- **Composer** controls block order, composition, spans, alignment, media
  arrangement and responsive behaviour.

Block configuration must not contain colour or typeface values, and theme tokens
must not contain layout values. **Changing typography or palette must never
rewrite page layout data.**

### Out of scope for the composer

- unrestricted absolute x/y positioning
- pixel-level canvas placement
- Figma-style freeform canvas
- arbitrary z-index editing
- arbitrary CSS editing
- arbitrary custom HTML or JavaScript
- arbitrary breakpoint creation
- arbitrary external font injection

The goal is high creative freedom **inside a safe responsive system**.

The public portfolio visual quality takes priority over making the CMS look visually elaborate.

---

## 14. Validation

Every external input is untrusted.

Use Zod at the HTTP boundary.

TypeScript types do not replace runtime validation.

Validate at minimum:

- IDs
- slugs
- enums
- page/pageSize
- project metadata lengths
- block configuration shape by block type
- upload MIME type and size
- external video URLs/providers
- reorder payload ownership and completeness
- insertion `position` bounds against the current sibling count (§7)
- poster targets, asset default or placement override: a live `IMAGE` with
  `status = READY`, never the media it is the poster for, and a placement
  override only on a `VIDEO` or `EXTERNAL_VIDEO` placement (ADR-0009, ADR-0015)
- grid placement: `colStart >= 1`, `colSpan >= 1`, `colStart + colSpan <= 13`
- breakpoint keys against the closed set (desktop, tablet, mobile)
- nesting depth: a GRID may not contain a GRID or a GALLERY (§13)
- that block configuration carries no colour or typeface values (§13)
- GALLERY presentation mode against the closed mode set (§13)
- `VIDEO_GRID` column counts, bounded, at every breakpoint
- `playback.mode` against the closed enum; reject `controls` unless
  `CLICK_TO_PLAY`; reject any autoplay mode on `EXTERNAL_VIDEO` media
- `AUTOPLAY_AMBIENT` only on a standalone ambient VIDEO block — reject it on any
  VIDEO with a parent, on any GALLERY default, and on any `VIDEO_GRID` item.
  Validate from the block's container, not by counting videos per page.
- **reject** `autoplay`, `muted`, `playsInline` and `pauseWhenOffscreen` as
  inputs — they are derived (ADR-0008). Accepting and ignoring them is worse
  than rejecting them.
- HERO overlay configuration as a **closed object** with
  `additionalProperties: false` (ADR-0010): `anchor` against its closed enum,
  column placement against the same `colStart`/`colSpan` bounds as grid
  placement
- **reject any authored title or text field** in HERO overlay configuration —
  the title resolves from `projects.title`, and a title in `config` is a defect,
  not an alternative encoding (ADR-0010)
- **reject** a HERO overlay on a non-HERO block, on a HERO that is not
  project-owned, and on any video HERO whose playback mode is not
  `CLICK_TO_PLAY` — including both autoplay modes (ADR-0010)
- **reject** authored scrim, colour, typeface, opacity, z-index and coordinate
  values in HERO overlay configuration — all are derived (ADR-0010)

`position` bounds cannot be validated by the request schema alone — the upper
bound `N` depends on current database state. Zod enforces `integer >= 0` at the
HTTP boundary; the service enforces `position <= N` inside the insert
transaction and raises `VALIDATION_ERROR` (422) when it is exceeded.

Never trust a client-supplied project ID to imply ownership/authorization.

---

## 15. Transactions

Use database transactions for operations that must be atomic, including:

- project reorder (display and featured)
- block reorder
- block-media reorder
- block insertion at a position, with the sibling shift
- block-media insertion at a position, with the sibling shift
- publish validation + state transition
- multi-record archive/delete workflows

A failed reorder must not leave partial positions committed.

A failed insert must not leave shifted siblings committed. Bounds checking, the
shift and the insert all occur inside the same transaction, so a concurrent
insert cannot invalidate the bound between check and write.

---

## 16. Security Minimums

- strong password hashing (Argon2id preferred; bcrypt acceptable if deployment constraints require it)
- HTTPOnly cookies
- Secure cookies in production
- appropriate SameSite setting
- CSRF-aware mutation design
- rate limiting on project password attempts and admin login
- server-side authorization for every admin mutation
- server-side project-access verification before private content retrieval
- upload MIME/size validation
- environment secrets never shipped to client bundles
- private projects should emit `noindex, nofollow`

Never log plaintext passwords.

---

## 17. Testing Priorities

Minimum critical tests:

1. Public list never returns drafts, soft-deleted projects, or **PRIVATE
   projects in any form** — including cover media, short description, year and
   category (ADR-0003).
2. Private project content cannot be retrieved without access.
3. Correct private password grants access; wrong password does not.
4. Password hash never appears in API DTOs.
5. Unauthorized callers cannot mutate admin resources.
6. Reordering is atomic and produces contiguous integer positions, for
   **projects, featured projects, blocks and block media** (ADR-0002).
7. Media in use cannot be deleted.
8. Project publish enforces required invariants.
9. Block deletion does not delete Media Library assets.
10. Public DTOs do not leak internal fields.
11. `displayPosition` and `featuredPosition` are rejected by
    `PATCH /projects/{projectId}` (ADR-0002).
12. Insertion with `position` omitted appends to the end; insertion with an
    in-range `position` shifts siblings right and leaves positions contiguous
    from 0, for both blocks and block media (ADR-0005).
13. Insertion with `position > N` or `position < 0` returns `422` and commits
    nothing — no partially shifted siblings (ADR-0005).
14. A grid child whose placement exceeds the 12-column bound is rejected
    (ADR-0006).
15. A block authored with desktop-only placement still renders as a readable
    full-width stack at mobile (ADR-0006).
16. A GRID cannot be nested inside a GRID or a GALLERY (ADR-0006).
17. Duplicating a block deep-copies its children and its `block_media`
    references, and copies no Media Library asset (ADR-0006).
18. Hidden blocks never appear in public responses (ADR-0006).
19. Changing the theme does not modify any block configuration row (§13).
20. No public page ever initiates audible playback; autoplay modes are always
    muted (ADR-0008).
21. `CLICK_TO_PLAY` cannot be combined with autoplay, and `controls` is rejected
    outside `CLICK_TO_PLAY` (ADR-0008).
22. An autoplay mode on `EXTERNAL_VIDEO` media is rejected (ADR-0008).
23. Under `prefers-reduced-motion`, autoplay surfaces render a still poster and
    start no playback (ADR-0008).
24. A refused autoplay falls back to the poster frame, not a blank tile
    (ADR-0008).
25. Hidden blocks neither preload nor decode video (ADR-0006, ADR-0008).
26. `AUTOPLAY_AMBIENT` is rejected on a VIDEO inside a GRID, on a GALLERY
    default, and on a `VIDEO_GRID` item — and cannot be inherited into a
    multi-item surface (ADR-0008).
27. An image referenced as a poster cannot be deleted — the in-use check covers
    `media.poster_media_id` and `block_media.poster_media_id` and returns
    `409 MEDIA_IN_USE` (ADR-0009, ADR-0015).
28. A poster target must be an `IMAGE` with `status = READY`, and no asset or
    placement may use its own media as its poster (ADR-0009, ADR-0015).
29. Poster resolution falls back placement poster → asset poster →
    `thumbnail_url` → empty well (ADR-0009, ADR-0015).

---

## 18. Implementation Workflow

Before editing code for a task:

1. Read this file.
2. Read the relevant OpenAPI paths and database schema.
3. Inspect existing implementation before creating new abstractions.
4. State any contract conflict before changing code.
5. Implement the smallest coherent vertical slice.
6. Run formatter/linter/typecheck/tests relevant to the change.
7. Report files changed, tests run, and any unresolved issue.

Do not mark work complete when typecheck/tests are known to fail.

---

## 19. Out of V1 Scope

Do not implement unless explicitly requested:

- public user registration/accounts
- public admin registration endpoint
- client dashboard
- ecommerce/payments
- booking system
- comments/social features
- realtime collaboration
- multi-role admin permissions
- absolute-position / Figma-style freeform canvas editor
- arbitrary z-index editing, arbitrary CSS, arbitrary custom HTML or JavaScript
- arbitrary breakpoint creation
- arbitrary-HTML, custom-code or embed block types
- revision/version history
- microservices
- Contact form API, persistence table, email provider, or spam system
- private albums (ADR-0019 §5)
- showing PRIVATE projects as locked cards in the public listing

### Contact page

Contact content is CMS-managed (ADR-0017): statement, email, rows, note and an
optional identity still. It has no form, no message API, no message table and
no delivery integration.

### About Me page

About Me content is CMS-managed structured content (ADR-0017). Its committed
content file remains the fallback until the page is first published.

---

## 20. Change Control

The following are contract changes and require explicit approval:

- database table/relationship redesign
- deleting or renaming public REST endpoints
- changing DTO semantics
- replacing REST with direct server actions as the primary domain contract
- changing PostgreSQL/Drizzle
- changing private-project authentication model
- adding public user accounts
- replacing the block-based composer with an absolute-position freeform canvas
- adding a block type, or adding arbitrary-HTML/custom-code blocks
- changing the logical column count or the fixed breakpoint set
- changing the composer's responsive derivation rules (§13)

For a proposed change, write:

```text
ADR Proposal
Problem:
Current behavior:
Proposed change:
Why:
Compatibility impact:
Migration impact:
Alternatives considered:
```

Do not silently apply the proposed architecture change.

Approved ADRs live in `docs/architecture/decisions/` and are numbered
sequentially (`0001-*.md`). An ADR records a decision that has already been
approved; it is not a request for one.

---

## 21. Design Governance

Design authority is separate from engineering authority. This section governs
**what the product looks like**. §22 governs **how it is built**. Neither ladder
overrides the other; they answer different questions.

### Visual design precedence

```text
1. Approved project-specific design specifications
2. User-provided visual references
3. Human product intent
4. External/general design guidelines
```

Higher-numbered sources never override lower-numbered ones.

**External design guidance is advisory.** It must never override an explicit
project-specific visual choice, and it must never override a user-provided
visual reference. Where an external guideline and a reference disagree, the
reference wins and the guideline is set aside for that decision.

### Where each tier lives

| Tier | Source | Location | Status |
|---|---|---|---|
| 1 | Approved design specification | `docs/design/` | **No approved specification exists yet — Tier 1 is currently empty.** `docs/design/design-direction.md` exists with status **Draft — Pending Design Exploration**. It is an **input to** Claude Design exploration, not its conclusion, and it does **not** carry Tier 1 binding authority until explicit Project Owner / Software Architect approval. `design-system.md` and `page-specifications.md` do not exist yet. |
| 2 | User-provided visual references | `docs/human-description/references/` | Present. See `references/INDEX.md`. Image files are local-only, not in Git. |
| 3 | Human product intent | `docs/human-description/description.md` | Present. Source of record is `description.source.docx`. |
| 4 | External/general design guidelines | `docs/design/guidelines/frontend-design/` | **Imported.** Anthropic frontend-design skill: `SKILL.md`, `LICENSE.md`, `SOURCE.md`. Advisory only. |

### Reference scope limits

A visual reference may be admitted for some qualities and excluded for others.
`references/INDEX.md` records the scope of each reference and is binding.

`5. horizontal-card-layout.png` is admitted for **layout and interaction only** —
horizontal card/content strip, layout rhythm, composition concept. Its colour
palette, typography, button styling, branding tone and visual identity are
**excluded**.

### Intent qualities that must survive

References 1–4 are visual direction, not a site to reproduce pixel-for-pixel.
The design may evolve, but must preserve:

- editorial
- cinematic
- media-first
- oversized typography where appropriate
- asymmetric composition
- strong filmmaking imagery
- the public site must not look like a SaaS product

### Reading of the human description's deference clause

`description.md` closes by deferring to "technical architecture, database design,
API contracts, and implementation details". That clause is about the
**engineering** ladder in §22. It does **not** demote human product intent below
external design guidelines. Tier 3 still outranks tier 4.

---

## 22. Engineering Precedence

```text
A. CLAUDE.md
B. Approved architecture decisions (docs/architecture/decisions/)
C. openapi.yaml — the HTTP contract
D. db/schema.ts and db/migrations/ — persistence
E. Implementation code
```

Do not silently change a higher-precedence artifact to make implementation
easier. If implementation cannot satisfy a higher-precedence artifact, stop and
raise it under §20.

A conflict between two artifacts at the same level, or an artifact that
contradicts itself, is a defect — report it rather than choosing a side.
