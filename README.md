# Filmmaker Portfolio V1

A professional filmmaker portfolio: public site (Home, Art Works, About Me,
Contact), public and password-protected project pages, and an admin CMS with a
block-based project builder.

**Status: planning and contracts only.** There is no application code yet.
Next.js has not been bootstrapped and no dependencies are installed.

Core V1 engineering contracts are approved. The current `openapi.yaml` and
`db/schema.ts` baseline implements **ADR-0001 through ADR-0005**. The approved
extensions from **ADR-0006, ADR-0007 and ADR-0009** remain to be applied, in one
coordinated migration and API update (see the ADR log). Those three ADRs are
approved decisions; it is only their schema and contract work that is
outstanding. Implementation has not begun.

## Repository map

```text
CLAUDE.md                     Engineering governance. Read this first.
README.md                     This file.
openapi.yaml                  Canonical REST contract (OpenAPI 3.1).

db/
  schema.ts                   Canonical Drizzle/PostgreSQL schema.
  migrations/
    0001_initial.sql          Initial SQL migration.

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
    prototypes/
      home/
        MEDIA.md              Manifest for the local-only prototype footage.
    guidelines/
      frontend-design/        Imported Anthropic frontend-design skill.
                              Advisory only (CLAUDE.md §21, tier 4).
  architecture/
    decisions/                Approved ADRs. See its README.

scripts/                      Operational scripts. seed-admin.ts is reserved.
src/                          Application code. Does not exist yet.

imgs & videos/                Local-only prototype footage. Untracked and
                              gitignored; a fresh clone will not have it.
                              See docs/design/prototypes/home/MEDIA.md.
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

## Implementation sequence

Not yet started. When it begins:

1. Initialise the Next.js / TypeScript application in `src/`.
2. Configure PostgreSQL + Drizzle. `drizzle.config.ts` points at `./db/schema.ts`
   with `out: './db/migrations'` (ADR-0001).
3. Apply migrations and confirm schema parity.
4. Authentication and Project CRUD as the first API vertical slice.
5. Project Builder, Media, and Private Project Access in later slices.
6. CMS UI only after the corresponding domain/API behaviour works.
7. Public site UI only after the design specification is approved. Per architect
   decision Q13 the external design guideline had to be imported and reviewed
   alongside the visual references first — that import is complete and lives in
   `docs/design/guidelines/frontend-design/`. `design-direction.md`,
   `design-system.md` and `page-specifications.md` now exist, but all are
   **Draft / candidate and not approved**, so tier 1 remains empty.

## Schema parity

`db/schema.ts` is the canonical model definition.

`db/migrations/0001_initial.sql` is a hand-authored equivalent for review and
bootstrap. Once the repository is initialised with a pinned Drizzle version, use
Drizzle Kit to generate subsequent migrations from schema changes rather than
hand-editing migration history.

The two are currently in agreement: same five enums, five tables, all columns,
nine check constraints and fourteen indexes. There is no automated parity check
yet, so this must be re-verified whenever either file changes.

## Version control

This repository is under Git, on branch `main`, with no remote configured.

Two directories are deliberately untracked and gitignored. Each has a tracked
manifest that travels in their place:

| Untracked | Tracked manifest |
|---|---|
| `docs/human-description/references/*.png` | `docs/human-description/references/INDEX.md` |
| `imgs & videos/` | `docs/design/prototypes/home/MEDIA.md` |

A fresh clone contains neither. Both must be restored manually from wherever the
owner keeps them, under the exact filenames the manifests list — the filenames
are load-bearing.
