# ADR-0001 — Canonical persistence lives at root-level `db/`

- **Status:** Approved
- **Date:** 2026-09-21
- **Decided by:** Project Owner / Software Architect
- **Affects:** CLAUDE.md §5, §6 · `db/schema.ts` · `db/migrations/`

## Problem

CLAUDE.md contradicted itself about where the persistence layer lives.

- §5 "Domain Boundaries → Suggested structure" nested it as `src/db/schema.ts`,
  `src/db/migrations/`, `src/db/client.ts`.
- §6 "Database Rules" declared `db/schema.ts` and
  `db/migrations/0001_initial.sql` — repository root.
- `README.md` agreed with §6.

Both statements were in the single highest-precedence engineering artifact, so
neither could be treated as authoritative over the other. Any implementer wiring
up `drizzle.config.ts` had to guess, and a wrong guess silently breaks migration
generation and schema-parity checks.

## Current behaviour before this decision

Neither path existed. The files were flat in `docs/`:

```text
docs/schema.ts
docs/0001_initial.sql
```

So §6 and README both referenced paths that resolved to nothing.

## Decision

Root-level `db/` is canonical.

```text
db/
  schema.ts
  migrations/
    0001_initial.sql
  client.ts          # not yet written
```

`src/db/` is not used. CLAUDE.md §5 has been corrected to show `db/` as a
sibling of `src/`, not a child.

## Why

- §6 is a **rule**; §5 is labelled a **suggestion**. Where a rule and a
  suggestion conflict, the rule wins.
- `README.md` independently agreed with §6, making it two sources to one.
- Drizzle Kit convention places `schema` and `out` outside the application
  source tree, so root-level `db/` matches the tool's defaults with less
  configuration.
- The schema and its migrations are consumed by tooling (drizzle-kit, psql,
  CI parity checks) that is not part of the Next.js build. Keeping them out of
  `src/` keeps that boundary honest.

## Compatibility impact

None. No application code exists yet, so no import path changes.

`drizzle.config.ts`, when written, must point at `./db/schema.ts` with
`out: './db/migrations'`.

## Migration impact

None at the database level. Two files were relocated:

```text
docs/schema.ts          -> db/schema.ts
docs/0001_initial.sql   -> db/migrations/0001_initial.sql
```

File contents were not modified.

## Alternatives considered

**`src/db/` (as §5 suggested).** Rejected: contradicts the §6 rule and README,
and puts non-application tooling artifacts inside the application source tree.

**Keep both, with `src/db/` re-exporting from root `db/`.** Rejected: two import
paths for one module is precisely the ambiguity this ADR exists to remove.

**Leave the contradiction and decide at implementation time.** Rejected: the
contradiction sits in the top-precedence governance document, where it would
have been re-litigated by every future contributor.
