# ADR-0007 — Page-owned block compositions (Home)

- **Status:** Approved
- **Date:** 2026-09-21
- **Decided by:** Project Owner / Software Architect
- **Related:** ADR-0006 (composer), ADR-0002 (ordering), ADR-0005 (insertion)
- **Affects:** CLAUDE.md §6, §13 · `db/schema.ts` (deferred) · `openapi.yaml` (deferred)
- **Change class:** Database table/relationship redesign (CLAUDE.md §20)

## Problem

The locked requirement states that **Home must become CMS-composeable**, and
that the Home concept explored in Claude Design — hero, featured work, frames,
about teaser — must **not** become a hard-coded template. The administrator must
be able to reorder, replace, remove, duplicate and reconfigure those blocks
without a developer.

The current model cannot express this at all:

```ts
export const projectBlocks = pgTable("project_blocks", {
  projectId: uuid("project_id").notNull().references(() => projects.id, ...),
  ...
});
```

`project_id` is `NOT NULL` with a foreign key to `projects`. **Every block must
belong to a project.** Home is not a project, so Home cannot own blocks.

This is the one part of the composer requirement that the existing relational
model genuinely cannot absorb through configuration. Everything else in
ADR-0006 either fits the current model or needs only an additive column.

## Current behaviour before this decision

Home has no persistence at all. It would be hard-coded in the page component —
precisely what the requirement forbids.

## Decision

### 1. Introduce a `pages` entity for singleton editorial pages

A small table for CMS-composeable non-project pages, keyed by a stable
identifier rather than a slug, because these pages are singletons with fixed
routes.

Home is the only such page in V1.

### 2. Blocks gain a page owner

`project_blocks` gains a nullable `page_id`, and `project_id` becomes nullable,
with a `CHECK` enforcing that **exactly one owner is set**:

```text
(project_id IS NOT NULL AND page_id IS NULL)
OR
(project_id IS NULL AND page_id IS NOT NULL)
OR
(parent_block_id IS NOT NULL AND project_id IS NULL AND page_id IS NULL)
```

The third arm covers ADR-0006's nested children, which are owned by their parent
block rather than directly by a page or project.

### 3. The block model is shared, not duplicated

Home blocks are the *same* blocks: same seven types, same `config` validation,
same ordering, same insertion semantics, same nesting rules, same hide/show.
There is exactly one composer, one renderer and one set of block rules.

### 4. Page scope stays bounded

- **Home** — composer-driven. A `pages` row.
- **Project detail** — composer-driven, unchanged, owned by `projects`.
- **Art Works** — **not** a composed page. It stays data-driven and
  gallery-oriented, rendering the project list. It may gain presentation
  options later; it does not become a free page builder.
- **About Me** — **not** a composed page. Content-file managed, per CLAUDE.md
  §19. Not silently converted.
- **Contact** — static, per CLAUDE.md §19.

Adding a page to this set is a §20 contract change.

## Why

- **Home genuinely cannot be composed without a schema change.** No amount of
  `config` modelling attaches a block to a non-project. This is a structural
  relationship, and CLAUDE.md §6 forbids pushing those into JSON.
- **A shared block table over a parallel `page_blocks` table.** Duplicating the
  block model would duplicate ordering, insertion, validation, nesting,
  hide/show, the DTO mapper and the renderer — two of everything, forever
  drifting. One nullable column and a `CHECK` is dramatically smaller.
- **A keyed singleton over a slug-based page system.** Home has a fixed route
  and there is exactly one of it. A general page system with slugs, publication
  and routing is a different product, and nothing in the requirement asks for it.
- **Art Works and About stay out** because the requirement explicitly says so.
  Art Works is a *view over data*, not a composition; making it composeable
  would mean the project list itself becomes editable furniture.

## Compatibility impact

No client code exists, so no runtime breakage.

`openapi.yaml` is **not contradicted** — it is incomplete. Every block endpoint
is currently project-scoped (`/projects/{projectId}/blocks`), so there is simply
no route by which a page composition could be read or written. Those routes are
additions, not corrections, and are deliberately not made at this stage.

Making `project_id` nullable is a **widening** change to an existing column.
Every current read path filters by a known `project_id` and is unaffected.

## Migration impact

None yet. Nothing is applied by this ADR.

### Deferred schema work — specified, not applied

When composer implementation begins:

1. **New table `pages`** — `id uuid pk`, `key` (unique, stable identifier such
   as `HOME`), `title`, optional SEO fields, `created_at`, `updated_at`.
2. **`project_blocks.page_id uuid NULL`** referencing `pages(id)`
   `ON DELETE CASCADE`.
3. **`project_blocks.project_id`** relaxed to nullable.
4. **`CHECK`** enforcing exactly-one-owner as in §2 above.
5. **Index** on `(page_id, position)`.
6. Seed the `HOME` row as part of the migration — Home must exist before it can
   be composed.

Naming note: once blocks can belong to a page, the table name `project_blocks`
is misleading. Renaming it to `blocks` is the honest change, but it is a
breaking rename affecting every query. **Deferred as a separate decision** —
the name is cosmetic, the owner column is not, and the two should not be
coupled in one migration.

Also deferred: the corresponding `openapi.yaml` additions — page-scoped block
routes, a `Page` DTO, and a page composition read for the public Home route.

## Implementation constraints

1. **One composer, one renderer.** If page composition and project composition
   need different code paths beyond the owner lookup, the abstraction is wrong.
2. **The exactly-one-owner `CHECK` is not optional.** Without it the table
   admits orphan and double-owned rows, and the ordering contract (ADR-0002,
   "the complete set in the target container") becomes unverifiable.
3. **`pages` is not a general CMS page system.** No slugs, no publication
   workflow, no admin-created pages in V1. Adding any of those is a §20 change.
4. **Home has no privacy model.** ADR-0003's private-project rules apply to
   projects only. Home is always public.
5. **Seeding must be idempotent**, consistent with `scripts/seed-admin.ts`
   (CLAUDE.md §11).

## Alternatives considered

**A parallel `page_blocks` table.** Rejected: duplicates the entire block
subsystem — types, ordering, insertion, nesting, validation, DTOs, renderer —
and guarantees the two copies diverge.

**Model Home as a reserved `projects` row.** Rejected: it pollutes project
semantics and actively breaks existing rules. Home would need excluding from the
public listing, from `display_position` ordering (ADR-0002), and from the
publication and visibility rules in §6. Every project query would need a
"except the Home one" clause — the classic magic-row failure.

**Keep Home hard-coded in V1.** Rejected: explicitly forbidden by the locked
requirement.

**A full slug-based page builder for all four public pages.** Rejected: the
requirement explicitly keeps Art Works data-driven, About content-file managed
and Contact static. Building a general page system would be over-engineering and
would contradict three stated constraints.

**Polymorphic `owner_type` / `owner_id` without foreign keys.** Rejected: loses
referential integrity and cascade behaviour. Two nullable typed FKs plus a
`CHECK` keeps both.
