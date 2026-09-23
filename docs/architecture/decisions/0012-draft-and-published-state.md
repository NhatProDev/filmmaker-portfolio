# ADR-0012 — Draft and published state

- **Status:** Approved
- **Date:** 2026-09-24
- **Decided by:** Project Owner / Software Architect (Director clarification)
- **Related:** ADR-0003 (private projects), ADR-0007 (pages), ADR-0009 and ADR-0011 (`MEDIA_IN_USE`)
- **Affects:** CLAUDE.md §6, §15, §19 · `db/schema.ts` (later) · `openapi.yaml` (later)
- **Change class:** Database table/relationship redesign (CLAUDE.md §20)

## Problem

`projects.status` is a single column. Editing a published project changes what
visitors see immediately, so "preview before publishing" works only for a
project that has never been published.

## Current behaviour before this decision

Public reads filter working rows by `status = 'PUBLISHED'`. There is one copy of
every project, and it is the live one.

## Decision

```text
working copy  →  explicit Publish  →  one current published snapshot  →  public read
```

- The administrator always edits the **working copy**.
- **Publish** validates the working copy and writes the **current published
  snapshot** for that owner, replacing the previous one.
- **Unpublish** removes the snapshot.
- The public site reads **only** the snapshot.

**This is not revision history.** There is exactly **one** current snapshot per
publishable owner. Older snapshots are not kept, listed or restorable
(CLAUDE.md §19 keeps revision history out of V1). There is no scheduled
publishing.

Publishable owners are projects and, when its editing arrives, the HOME page.

### Phase 2C adds no publication schema

The snapshot store and its media-reference table are **new tables**. Adding
them later is additive: nothing in the Phase 2C schema has to be rewritten, and
no destructive migration is avoided by creating them early. Creating them now
would add unused structures and a second read path before the publish workflow
exists. They are introduced with the workflow, in Phase 2E.

Until then public reads continue to use the working rows filtered by `status`,
as the existing contract specifies. Editing a published project is live until
Phase 2E closes the gap.

### Shape expected in Phase 2E (non-binding)

- a per-owner publication row holding the snapshot as a **validated** public
  view model, with `published_at`;
- a relational list of the media the snapshot references, so that
  `MEDIA_IN_USE` protects media visible on the live site even when the working
  copy no longer uses it.

## Why

- One live copy plus one working copy is the smallest model that makes preview
  honest.
- A snapshot of the public view model makes the public read path a single read,
  and makes "what is live" explicit.
- Deferring the tables costs nothing, because their introduction is additive.

## Compatibility impact

None in Phase 2C. In Phase 2E the public read path switches from working rows to
snapshots; `publish`/`unpublish` keep their existing routes.

## Migration impact

None in Phase 2C.

## Implementation constraints

1. Never keep more than one snapshot per owner.
2. Validate the snapshot against the public view-model schema before writing it.
3. `MEDIA_IN_USE` must include media referenced by any current snapshot.
4. No revision browsing, no restore, no scheduled publishing.

## Alternatives considered

**Status-only publishing.** Rejected as the end state: edits to live projects
would be visible before they are finished. Kept only until Phase 2E.

**Full revision history.** Rejected: out of V1 scope (§19).

**A duplicated draft copy of every table.** Rejected: doubles the block model
for no gain over a snapshot of the public view.
