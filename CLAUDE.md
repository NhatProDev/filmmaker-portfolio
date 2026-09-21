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
- Block-based drag-and-drop Project Builder

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
- Full free-form Squarespace-style canvas: out of V1 scope

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

Initial SQL migration: `db/migrations/0001_initial.sql`.

Both paths are relative to the repository root. See ADR-0001.

Core tables:

- `admin_users`
- `projects`
- `project_blocks`
- `block_media`
- `media`

Relationships:

```text
PROJECT 1:N PROJECT_BLOCK
PROJECT_BLOCK 1:N BLOCK_MEDIA
MEDIA 1:N BLOCK_MEDIA
PROJECT N:1 MEDIA (optional cover)
```

`PROJECT_BLOCK.config` and `BLOCK_MEDIA.config` hold presentation configuration only.

Do not move canonical media relationships into JSON config.

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

Four collections are reorderable:

```text
projects (display order)      PUT /api/v1/projects/order
projects (featured order)     PUT /api/v1/projects/featured/order
blocks within a project       PUT /api/v1/projects/{projectId}/blocks/order
media within a block          PUT /api/v1/blocks/{blockId}/media/order
```

Reordering projects, blocks or media must use one API request and one database
transaction.

Do not make one HTTP mutation for every moved row.

`projects.display_position` and `projects.featured_position` are therefore **not
writable through `PATCH /api/v1/projects/{projectId}`**. The ordering endpoints
are their only write path. See ADR-0002.

### Insertion semantics

These rules govern creation, not reordering. They apply to:

```text
POST /api/v1/projects/{projectId}/blocks     siblings = blocks of that project
POST /api/v1/blocks/{blockId}/media          siblings = block_media of that block
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

The initial admin is created out-of-band by `scripts/seed-admin.ts`, which reads
credentials from environment variables. The path is reserved; the script is not
yet written.

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

Media deletion must fail with `409 MEDIA_IN_USE` while referenced by a project cover or block.

Deleting a block deletes only the `block_media` references, not the Media Library asset.

Storage provider logic belongs behind an infrastructure abstraction; domain services should not depend on Cloudinary/S3-specific response shapes.

---

## 13. Project Builder Rules

V1 supports structured blocks:

- HERO
- TEXT
- IMAGE
- VIDEO
- GRID
- GALLERY
- SPACER

This list is closed. Do not add a block type to satisfy a layout requirement.

**Asymmetric layouts are `GRID` configuration, not a block type.** The human
description lists "asymmetric layout presets" among its layout blocks; that
intent is satisfied by named layout presets inside `GRID.config`, validated per
block type under §14. See ADR-0004.

V1 grid/layout behavior is constrained and responsive.

Do not implement arbitrary absolute-position canvas editing, overlapping objects, or complex per-breakpoint free positioning.

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
- full free-form Squarespace editor
- revision/version history
- microservices
- Contact form API, persistence table, email provider, or spam system
- CMS-managed About Me content (no About table, no About API)
- showing PRIVATE projects as locked cards in the public listing

### Contact page

V1 Contact is static. It may contain an email/`mailto:` link, social links and
other public contact information. It has no API, no database table and no
delivery integration.

### About Me page

V1 About Me is not CMS-managed. Treat its content as application/content-file
content committed with the code.

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
- replacing block-based builder with a free-form canvas

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
| 1 | Approved design specification | `docs/design/` | **Does not exist yet.** Not to be authored until tier 4 is imported and reviewed alongside tier 2. |
| 2 | User-provided visual references | `docs/human-description/references/` | Present. See `references/INDEX.md`. |
| 3 | Human product intent | `docs/human-description/description.md` | Present. Source of record is `description.source.docx`. |
| 4 | External/general design guidelines | `docs/design/guidelines/` | **Empty by instruction.** Do not invent contents. An external frontend-design guideline will be imported later. |

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
