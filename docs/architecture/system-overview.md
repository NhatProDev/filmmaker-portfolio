# System overview

The whole system on one page, as of Phase 3D (`phase-3d-launch-v1`). Each
section links to the document that holds the detail.

- `CLAUDE.md` and the ADRs remain the authority.
- Where this page and one of them disagree, they win, and this page has a
  defect.

## 1. Topology

```text
Visitor / admin browser
   │ https
   ▼
Vercel (Hobby, region sin1) ── Next.js 16 app: public site, Studio (/admin), REST API (/api/v1)
   │ SQL (TLS verify-full)                    │ presigned S3 requests (SigV4)
   ▼                                          ▼
Neon PostgreSQL 17 (Free, ap-southeast-1)    Cloudflare R2
                                               ├─ portfolio-media-public   (public; r2.dev today, media.<domain> later)
                                               └─ portfolio-media-private  (never public; presigned only)
```

- **Hosting:** Vercel builds on every push to `main` and deploys it to
  production. `vercel.json` pins the region. The public pages are prerendered
  at build time (ISR), and publishing revalidates them.
- **Domains:** production answers on `filmmaker-portfolio-beta.vercel.app`,
  and media on the public bucket's `r2.dev` host. Moving to a custom site and
  media domain is an owner-controlled procedure with no data migration
  (`docs/operations/domains.md`).
- **Decision record:** `docs/operations/deployment.md` (provider choice,
  environment manifest, release records).

## 2. Application architecture

A modular monolith in Next.js and TypeScript (CLAUDE.md §3–§5):

```text
route handler (Zod, auth, CSRF) → service (rules, transactions) → repository (Drizzle) → PostgreSQL
```

- **REST API:** versioned under `/api/v1`, camelCase JSON, stable error
  envelope. `openapi.yaml` is the contract (CLAUDE.md §8–§10).
- **Content gateway:** public pages read only a `ContentGateway`
  (`src/features/site-content/`). The **db** adapter serves published
  snapshots (production). The **static** adapter serves the committed
  content (the fallback and the test fixture).
- **Proxy:** `src/proxy.ts` routes unknown project and album slugs to the
  404, a visitor holding a private project's access cookie to the
  access-checked render, and admin previews to draft mode.

## 3. Data

- PostgreSQL through Drizzle.
- **Schema.** `db/schema.ts` is canonical; migrations `0001`–`0010` in
  `db/migrations/` are additive (CLAUDE.md §6).
- **Ids and ordering.** UUID ids. Ordering uses integer positions, rewritten
  in one transaction (ADR-0002, ADR-0005).
- **Deletion.** Soft delete for projects, media and albums.
- **Migrations** run from an operator machine with an explicit
  `--confirm-remote`, never from the build (`docs/operations/runbook.md` §1).

## 4. Media

- **The Media Library** holds reusable assets (ADR-0014): images, hosted
  video, and YouTube or Vimeo references.
- **Storage.** Rows store **keys**, and URLs are derived at render time.
  Public keys are served from the public bucket. A private key (`private/…`)
  is delivered only through a short-lived signed URL, after the
  project-access check (ADR-0020).
- **Uploads** go straight from the browser to R2 through a presigned PUT,
  then `complete` verifies the object (size, and the provider's checksum
  when enabled). Nothing is proxied through Next.js.
- **Posters** (ADR-0009, ADR-0015) and **active picture / letterbox**
  (ADR-0016) are relational properties of assets and placements.
- **Lifecycle:**
  - soft delete refused while in use (`MEDIA_IN_USE`);
  - `media:gc` (dry run first) for abandoned uploads, deleted assets and
    orphans;
  - upload integrity and its trust boundary are in
    `docs/operations/media-lifecycle.md`.

## 5. Authentication and access

- **Admins only.** Argon2id passwords. Server-side sessions in
  `admin_sessions` (a hashed token; `HttpOnly; Secure; SameSite=Strict`),
  revoked on sign-out and on a password reset. Sign-in is rate-limited.
  There is no registration. `db:seed-admin` provisions the admin
  (CLAUDE.md §11).
- **CSRF.** Every mutation checks its origin.
- **Private projects.** A per-project password, verified on the server,
  grants a signed, project-specific `HttpOnly` cookie. Attempts are
  rate-limited. A private project is never listed and is always `noindex`
  (ADR-0003, `publishing-and-private-access.md`).

## 6. Authoring (Studio at `/admin`)

- **Overview:** each content type and its publication state.
- **Projects:**
  - details, cover and preview, credits, and access and password;
  - the **Project Composer**: typed blocks (HERO, TEXT, IMAGE, VIDEO, GRID,
    GALLERY, SPACER) on a 12-column responsive grid, with drag and keyboard
    reorder, one-level GRID nesting, presets as starting points, and
    per-breakpoint placement (ADR-0006, ADR-0013;
    `project-composer.md`).
- **Home Composer:** Home as an ordered composition of its five closed
  sections (ADR-0018).
- **About and Contact:** structured CMS content with image slots
  (ADR-0017). Contact has no form.
- **Albums and collections:** ordered stills, grouped by collection
  (ADR-0019). Public routes are `/albums` and `/albums/<slug>`; they are not
  linked in the navigation.
- **Site settings:** footer and contact details (ADR-0017).
- **Media Library:** upload (public or private), alt text, default poster,
  picture area, usages.
- **Draft, preview and publish** (ADR-0012):
  - editors change a working copy;
  - Preview shows it on the real page (draft mode, admin only, `noindex`);
  - Publish validates and writes one snapshot;
  - the public site reads only snapshots.

## 7. Operations

| Need | Where |
|---|---|
| Environment contract | `docs/operations/environment.md`, `npm run env:check -- --production` |
| Migrate, import, seed, health, backup, restore, rollback | `docs/operations/runbook.md` |
| Health | `GET /api/v1/health` (database, schema, storage, release) and `npm run db:health` |
| Backup | `pg_dump` from a `postgres:17` container (Neon Free keeps only 6 h of PITR) |
| Media consistency | `npm run media:manifest`, `npm run storage:check`, `npm run media:gc` |
| Deploy | push `main` → Vercel; release records and tags in `deployment.md` |
| Rollback | redeploy a phase tag (migrations are additive); content: edit and publish again |
| Domains | `docs/operations/domains.md` |

## 8. Release tags

| Tag | Meaning |
|---|---|
| `public-frontend-v1` | Public frontend locked |
| `phase-2f-cms-v1` | CMS and database cutover |
| `phase-3a-composer-v1` | Composer |
| `portfolio-v1-production` | First production release (V1) |
| `phase-3b-authoring-v1` | Authoring |
| `phase-3c-content-system-v1` | Content system |
| `phase-3d-launch-v1` | Launch polish and hardening: the core system's release |

## 9. Out of scope

These are not part of the core system (CLAUDE.md §19, launch review §10):

- public accounts;
- commerce, booking, a client portal or a CRM;
- collaboration and revision history;
- a free canvas;
- arbitrary HTML or CSS.
