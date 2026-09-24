# Filmmaker Portfolio V1

A professional filmmaker portfolio: public site (Home, Art Works, About Me,
Contact), public and password-protected project pages, and an admin CMS with a
block-based project builder.

**Status: public frontend locked; database, admin API and Studio in place.**
The public site (Home, Art Works, Project Detail, About Me, Contact) is
implemented and reads all content through a content gateway. By default it
serves the committed static content and needs no database; a
PostgreSQL-backed adapter serves the same pages from the database model.

The Studio at `/admin` (projects, the template-shaped project and Home
editors, the Media Library) works over the REST API in `src/app/api/v1`, with Argon2id
sign-in, revocable server-side sessions and CSRF-checked mutations. It needs a
database; the public site does not. Uploads stay unavailable until a storage
provider is chosen (ADR-0014).

Publishing follows ADR-0012: the Studio edits a working copy, Publish writes
one validated snapshot, and the public site reads only snapshots. Preview opens
the working copy on the real public page for a signed-in admin. Private
projects open at their address behind the password gate; see
`docs/architecture/publishing-and-private-access.md`.

`db/schema.ts` implements ADR-0001 to ADR-0007, ADR-0009, ADR-0011, ADR-0014
and ADR-0015. `openapi.yaml` was realigned to that domain model by ADR-0015.

## Repository map

```text
CLAUDE.md                     Engineering governance. Read this first.
README.md                     This file.
openapi.yaml                  Canonical REST contract (OpenAPI 3.1).

db/
  schema.ts                   Canonical Drizzle/PostgreSQL schema.
  client.ts                   Database connection (opened only when used).
  migrations/                 Drizzle migration history, starting at
                              0001_initial.sql; meta/ holds Drizzle's journal.

docs/
  human-description/
    description.md            Human product intent.
    description.source.docx   Signed-off source of record for the above.
    references/               User-provided visual references.
      INDEX.md                What each reference demonstrates, and its scope.
  design/
    design-direction.md       Draft — direction. Pending design exploration.
    design-system.md          Draft — system-level visual rules, graded.
    design-handoff.md         Candidate — Home exploration evidence.
    page-specifications.md    Draft — per-page maturity and constraints.
    prototypes/               Candidate visual evidence. Nothing here is
                              approved. Each directory carries its own
                              MEDIA.md manifest and a review record.
      home/                   Home Baseline v2. legacy/ holds the superseded
                              prototype, retained as record.
      project-detail/         Project Detail 1B v2.
      art-works/              Art Works 2C v2.
      about/                  About Me 3B v2.
      contact/                Contact 4B v2.
      private-gate/           Private Gate 5B v2. No runtime media.
      responsive-system/      Cross-page responsive system evidence, not a
                              page: JUSTIFIED_ROWS narrow-width v1 (rejected /
                              comparison) and v2 (shared candidate).
    guidelines/
      frontend-design/        Imported Anthropic frontend-design skill.
                              Advisory only (CLAUDE.md §21, tier 4).
  architecture/
    decisions/                Approved ADRs. See its README.

scripts/                      Operational scripts: db-migrate.ts and
                              import-static-content.ts. seed-admin.ts is reserved.
src/                          Application code (Next.js). Public content is read
                              through src/features/site-content/.
tests/                        node:test suites; database tests run on an
                              in-process PostgreSQL (PGlite).

imgs & videos/                Local SOURCE / working media. The original
                              camera/export footage. Nothing renders from it
                              directly. Untracked and gitignored.
media/                        Local RUNTIME DERIVATIVE package. The web-sized
                              clips (clips/) and stills (w/) that the prototype
                              .dc.html evidence loads. Generated from the
                              above, not a source. Untracked and gitignored.

                              Neither media tier is in Git and neither is in a
                              fresh clone. The prototype evidence that loads
                              them IS tracked. See the MEDIA.md manifest in
                              each prototypes/ directory.
```

## Precedence

Two separate ladders, both defined in `CLAUDE.md`. They answer different
questions and neither overrides the other.

- **Engineering** — CLAUDE.md §22. `CLAUDE.md` › approved ADRs › `openapi.yaml`
  › `db/schema.ts` and migrations › implementation code.
- **Visual design** — CLAUDE.md §21. Approved design specification ›
  user-provided visual references › human product intent › external design
  guidelines.

Do not silently change a higher-precedence artifact to make implementation
easier. Contract changes require approval — see CLAUDE.md §20.

The locked V1 technology and architecture choices live in **CLAUDE.md §3** and
are deliberately not repeated here; a second copy would drift.

## Reading order

1. `CLAUDE.md` — in full.
2. `docs/architecture/decisions/` — the approved ADRs.
3. `openapi.yaml` and `db/schema.ts` for the area you are working on.
4. `docs/human-description/description.md` and
   `docs/human-description/references/INDEX.md` before any UI work.

## Commands

| Command | Does |
|---|---|
| `npm run dev` / `build` / `start` | The Next.js site. Uses the static content adapter unless `SITE_CONTENT_ADAPTER=db`. |
| `npm run typecheck` · `lint` · `test` | Checks. The tests need no database server. |
| `npm run db:generate` | Generates the next migration from `db/schema.ts`. |
| `npm run db:check` | Verifies the migration history's consistency. |
| `npm run db:migrate` | Applies migrations — **local development database only**. |
| `npm run db:import` | Dry run of the static-content import; add `-- --apply` to write (local database only). |
| `npm run db:seed-admin` | Creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, or resets its password and sessions (local database only). |
| `npm run db:verify` | Read-only: every public route served from the database compared with the committed content (local database only). |

To use the Studio locally: set `DATABASE_URL` to a local PostgreSQL, then run
`db:migrate`, `db:import -- --apply` and `db:seed-admin`, start the site, and
sign in at `/admin/login`. To serve the public site from the database, verify
with `db:verify` and build with `SITE_CONTENT_ADAPTER=db`; the full procedure is
in `scripts/README.md`. The static adapter remains the default and the test
fixture.

Configuration is in `.env.local`; see `.env.example`. No database is needed to
run the site.

## Migrations

`db/schema.ts` is the canonical model definition, and Drizzle Kit generates
every migration after the first from it. `db/migrations/0001_initial.sql` is the
original hand-authored baseline; Drizzle's journal adopts it as the first
migration, and its snapshot (`meta/0001_snapshot.json`) was verified to produce
a catalogue identical to the file (ADR-0015 §3 records its normalisation for
the migrator; no semantic DDL change is ever made to it). `0002` applies
ADR-0006, ADR-0007, ADR-0009, ADR-0011 and ADR-0014; `0003` seeds the HOME page
row; `0004` adds ADR-0015's placement poster override. Never hand-edit applied
migrations.

## Version control

This repository is under Git, on branch `main`, with no remote configured.

Three paths are deliberately untracked and gitignored. Each has a tracked
manifest that travels in its place:

| Untracked | What it is | Tracked manifest |
|---|---|---|
| `docs/human-description/references/*.png` | Tier-2 visual references | `docs/human-description/references/INDEX.md` |
| `imgs & videos/` | Local source / working media | `docs/design/prototypes/home/MEDIA.md` |
| `/media/` | Local runtime derivative package | The `MEDIA.md` in each `docs/design/prototypes/` directory |

A fresh clone contains none of them. All must be restored manually from wherever
the owner keeps them, under the exact filenames the manifests list — the
filenames are load-bearing.

### The two local media tiers

There are two untracked media directories at the repository root. They are
different things and must not be conflated.

- **`imgs & videos/` — local source / working media.** The original
  camera/export footage. Review material, and the input the derivatives are
  made from. Nothing renders from it directly.
- **`media/` — local runtime derivative package.** The web-sized clips
  (`clips/`) and stills (`w/`) that the prototype `.dc.html` evidence loads at
  runtime. Generated artifacts, not sources.

**Neither is committed, and neither should be.** Both are gitignored
(`imgs & videos/` and `/media/`), and **a fresh clone contains neither tier** —
both must be restored manually before any prototype will render. Neither is a
production asset store: production media is uploaded browser-to-object-storage
and referenced by the `media` table (CLAUDE.md §12). The mapping between
`media/` derivatives and the `imgs & videos/` source filenames is unrecorded
and unverified — do not infer one from filenames.

**The prototype evidence itself IS tracked.** Every `.dc.html`, `.md` and `.js`
file under `docs/design/prototypes/` is in Git. Only the media those files load
is not, so a fresh clone has the evidence and must restore the media to view it.
The Private Gate prototype is the one exception that needs nothing restored: it
has zero runtime media dependencies by design.

The two-tier distinction is recorded in full in
`docs/design/prototypes/home/MEDIA.md`; each other prototype directory's
`MEDIA.md` lists the specific assets that directory references.
