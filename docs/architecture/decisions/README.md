# Architecture Decision Records

Precedence tier **B** in the engineering ladder (CLAUDE.md §22): below CLAUDE.md,
above `openapi.yaml`.

An ADR here records a decision that has **already been approved** by the Project
Owner / Software Architect. It is not a request for one. To propose a change,
follow the ADR Proposal template in CLAUDE.md §20 and wait for approval.

Numbered sequentially. Never edit an approved ADR to reflect a later change —
write a new one that supersedes it, and mark the old one `Superseded by NNNN`.

## Log

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-root-level-db-directory.md) | Canonical persistence lives at root-level `db/`, not `src/db/` | Approved |
| [0002](0002-transactional-project-ordering-endpoints.md) | `PUT /projects/order` and `PUT /projects/featured/order`; position removed from `PATCH /projects/{projectId}` | Approved |
| [0003](0003-private-projects-excluded-from-public-listing.md) | PRIVATE projects are not enumerated publicly; `requiresPassword` removed from `PublicProjectSummary` | Approved |
| [0004](0004-asymmetric-layouts-as-grid-configuration.md) | Asymmetric layouts are `GRID` config presets, not a new block type | Approved |
| [0005](0005-insert-at-position-semantics.md) | `position` optional on create; omitted appends, in-range inserts and shifts siblings right, out-of-range is 422 | Approved |

All five were approved on 2026-09-21.
