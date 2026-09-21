# ADR-0002 — Transactional project ordering endpoints

- **Status:** Approved
- **Date:** 2026-09-21
- **Decided by:** Project Owner / Software Architect
- **Affects:** `openapi.yaml` · CLAUDE.md §7, §8 · `projects.display_position`, `projects.featured_position`
- **Change class:** REST contract amendment (CLAUDE.md §20)

## Problem

CLAUDE.md §7 requires that reordering use **one API request and one database
transaction**, and states plainly:

> Do not make one HTTP mutation for every moved row.

The contract honoured this for two of the three reorderable collections:

```text
PUT /api/v1/projects/{projectId}/blocks/order
PUT /api/v1/blocks/{blockId}/media/order
```

Projects had no equivalent. `projects.display_position` and
`projects.featured_position` were writable only through
`PATCH /api/v1/projects/{projectId}` — one project at a time.

Reordering the Art Works grid therefore required N HTTP mutations and N
transactions, which is exactly what §7 forbids, and which cannot satisfy §15's
requirement that a failed reorder leave no partial positions committed.

## Current behaviour before this decision

`UpdateProjectRequest` accepted `displayPosition` and `featuredPosition` as
ordinary patchable integer fields. Nothing in the contract prevented a client
from issuing a burst of per-row PATCHes, and nothing made such a burst atomic.

## Decision

Add two endpoints, mirroring the existing block and block-media ordering
operations:

```text
PUT /api/v1/projects/order            reorderProjects
PUT /api/v1/projects/featured/order   reorderFeaturedProjects
```

Both take the **complete** ordered set of UUIDs and reassign positions as
contiguous integers from 0 inside a single transaction.

```jsonc
// ReorderProjectsRequest / ReorderFeaturedProjectsRequest
{ "projectIds": ["<uuid>", "<uuid>", "..."] }
```

Responses: `204` on success; `409` when the payload is incomplete, references
unknown or soft-deleted projects, or (for the featured endpoint) contains a
project that is not featured; `401`, `404`, `422` as elsewhere.

**Consequent change:** `displayPosition` and `featuredPosition` were **removed
from `UpdateProjectRequest`**. The ordering endpoints are now their only write
path.

`isFeatured` **remains** patchable — toggling featured status is not reordering.
A newly featured project is appended to the end of the featured order by the
service.

## Why

- Restores compliance with §7 and §15 for the one collection that violated them.
- Mirrors the established `PUT …/order` + complete-ID-array shape already used
  twice in the contract, so there is one reorder idiom, not two.
- Requiring the complete set makes the contiguous-position invariant
  (§7, §17 test 6) checkable server-side in one statement, rather than inferred
  from a sequence of independent writes.
- Removing the per-row position fields closes the hazard structurally. Leaving
  them would have left the contract offering two ways to set position, one of
  which is forbidden by §7 — an invitation to the exact bug this ADR prevents.

## Compatibility impact

No client code exists, so no runtime breakage.

The removal of `displayPosition` and `featuredPosition` from
`UpdateProjectRequest` is a **narrowing DTO change**. `additionalProperties` is
`false` on that schema, so any future client sending either field receives a
`422 VALIDATION_ERROR` rather than silently no-op'ing. That is the intended
signal.

Display order is maintained across **all** non-soft-deleted projects regardless
of status. Public listings filter that single ordered set; they do not maintain
a separate ordering.

## Migration impact

None. No schema change. `projects.display_position` and
`projects.featured_position` already exist with the required check constraints
(`>= 0`, and `featured_position IS NULL OR >= 0`).

Note that neither column carries a uniqueness constraint. Contiguity and
uniqueness are enforced by the service inside the reorder transaction, not by
the database. This is consistent with how `project_blocks.position` and
`block_media.position` already behave.

## Alternatives considered

**Keep per-row PATCH and make the client batch them.** Rejected: explicitly
forbidden by §7, and unfixably non-atomic across requests.

**One endpoint with a `scope` discriminator instead of two paths.** Rejected:
the architect specified two paths, and it diverges from the existing
`…/blocks/order` idiom.

**Accept a partial payload (only the moved rows).** Rejected: contiguity cannot
be guaranteed from a partial set without a read-modify-write race, and the
existing `reorderBlocks` operation already rejects incomplete payloads with 409.

**Fractional indexing / LexoRank to avoid rewriting every row.** Rejected: §7
forbids it in V1 absent a demonstrated concurrency or performance need. A
filmmaker portfolio has tens of projects, not thousands.
