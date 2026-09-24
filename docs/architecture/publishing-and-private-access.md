# Publishing, preview and private projects — runtime design

- **Status:** Implementation record for Phase 2E. It implements ADR-0003,
  ADR-0012 and ADR-0014 §4, and records the engineering choices those ADRs left
  open. It is **not an ADR** and decides nothing the ADRs did not already
  approve. The choices marked *open for review* in §6 should be confirmed by the
  Project Owner.

## 1. Snapshots (ADR-0012)

- **Publish** builds a snapshot from the working copy and validates it in one
  transaction. The snapshot holds:
  - the project's content fields;
  - its visible blocks (hidden blocks are never published);
  - a record of every media asset they reference.

  The snapshot must pass its Zod schema, and it must render exactly on the
  locked templates (`renderProject` / `renderHome`). If either fails, publish
  answers `422 PROJECT_NOT_PUBLISHABLE` or `422 PAGE_NOT_PUBLISHABLE` with the
  reasons, and nothing is written.
- **One snapshot per owner.** Snapshots live in `project_publications` and
  `page_publications`. `publication_media` lists every asset a snapshot
  references, so `MEDIA_IN_USE` protects what is live even after the working
  copy stops using it.
- **Live fields are not snapshotted.** `slug`, `visibility`, the password,
  `status`, soft deletion and the display and featured orders act immediately.
  Making a project PRIVATE therefore hides it at once, without a publish.
- **Public reads use only snapshots.** Delivery URLs are derived when a
  snapshot is read, never stored (ADR-0014). Home shows its committed default
  until its first publish.
- **Unpublish, archive and soft delete** remove the snapshot.

## 2. Revalidation

The public pages are static. After a change a visitor can see, the whole
public tree is revalidated (`revalidatePath("/", "layout")`). Such changes are:

- publish, unpublish and archive;
- deletion;
- reordering;
- a live slug or visibility change on a published project.

The site is small enough that guessing which pages a change reaches is not
worth the risk of missing one.

## 3. Routing `/works/<slug>` (`src/proxy.ts`)

Next.js 16 renders a thrown `notFound()` in a dynamic route as an empty
`__next_error__` shell with the 404 drawn on the client. It also caches that
404 for every unknown slug. Both would change the locked 404 and let arbitrary
addresses grow the page cache.

So the proxy (Node runtime) routes by a short-lived (10 s) index of published
slugs (`src/features/site-content/project-router.ts`). A slug the index does
not know is looked up fresh, one slug, before it is called unknown, so a
project is routable the moment Publish returns, on every instance (Phase
2G-A):

| Slug | Goes to |
|---|---|
| published PUBLIC | the static page (ISR; `dynamicParams` lets a project published after the build render on first request) |
| published PRIVATE, no access cookie | the static password gate — no project data |
| published PRIVATE, with that project's access cookie | `/works/<slug>/live`, dynamic, verifies the cookie on every request |
| anything else | a path with no route, which serves the prerendered site 404 exactly as before |

The static pages never read cookies. Private content is never rendered into a
cacheable page.

## 4. Private access (CLAUDE.md §11, ADR-0003)

- `POST /api/v1/public/projects/{slug}/access` verifies the password against
  its Argon2id hash. It is rate-limited in PostgreSQL:
  - 10 attempts per 15 minutes per address and project;
  - 100 per 15 minutes per project.
- Success sets `portfolio_access_<slug>`, `HttpOnly`, `SameSite=Lax`,
  `Secure` in production, for 12 hours. Its value is
  `projectId:expiry:fingerprint` signed with HMAC-SHA256 using
  `PROJECT_ACCESS_SECRET`. The fingerprint is derived from the current
  password hash, so replacing the password revokes every access granted
  before.
- A PRIVATE project's media resolve to
  `/api/v1/public/projects/{slug}/media/{mediaId}`. That route streams the file
  only with valid access, and only if the published snapshot references it,
  with byte ranges and `Cache-Control: private, no-store`. With the `s3`
  storage adapter it answers `302` to a short-lived presigned URL instead, so
  storage serves the bytes (Phase 2G-A, `docs/operations/media-migration.md`).
- The unlocked page (`./live`) takes the project's own title, still
  `noindex, nofollow`; the gate and every failure keep the generic
  "Private project".

## 5. Preview

`GET /api/v1/projects/{id}/preview` and `GET /api/v1/pages/HOME/preview`
enable Next.js draft mode and redirect to the public address. A page renders
the working copy only when **draft mode is on and an admin session is valid**.
It then adds a floating admin banner. When the working copy cannot be rendered,
the page shows the same reason Publish would give. Visitors never see preview
output: without both conditions the page is the static published one.

## 6. Limitations and choices open for review

1. **Private media with the local adapter.** The access check applies to the
   URLs the site emits. Legacy keys still sit in `public/media` and are
   reachable by exact key. *Prepared in 2G-A:* keys under `private/` are never
   publicly addressable (local root outside `public/`; a private bucket with
   presigned GET for `s3`). A private project's media are protected at the file
   level once moved under `private/` (`docs/operations/media-migration.md`).
2. **Gate vs 404.** A private slug shows the gate and an unknown slug shows
   404, so the gate confirms that a private project exists at that address.
   This is the behaviour the gate design record left to engineering
   (`private-gate-5b-v2.md` §9.1). Unguessable slugs for private projects
   mitigate it. *Open for review.*
3. **Index staleness.** *Resolved for publishing in 2G-A:* a newly published
   project answers at once. Only a withdrawal can lag: for up to 10 seconds an
   instance may still route an unpublished or deleted slug to its page, which
   has already been revalidated and renders no project content.
4. **Unexpected gate errors** (the secret is unset, the network fails) show a
   third generic message in the design's message slot: "This work cannot be
   opened right now." *Open for review.*
5. **Tab title of an unlocked private project.** *Resolved in 2G-A:* the real
   title after verified access, generic before; always noindex.
