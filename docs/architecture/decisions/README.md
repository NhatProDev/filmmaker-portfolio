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
| [0004](0004-asymmetric-layouts-as-grid-configuration.md) | Asymmetric layouts are `GRID` configuration, not a new block type | Approved — preset-enum clause amended by 0006 |
| [0005](0005-insert-at-position-semantics.md) | `position` optional on create; omitted appends, in-range inserts and shifts siblings right, out-of-range is 422 | Approved |
| [0006](0006-responsive-visual-layout-composer.md) | Responsive Visual Layout Composer: GRID becomes a 12-column composition container, one level of block nesting, fixed desktop/tablet/mobile breakpoints with mobile safe-stacking | Approved — extended by 0008 |
| [0007](0007-page-owned-block-compositions.md) | Blocks may be owned by a `pages` singleton so Home is composer-driven; one shared block model, not a parallel table | Approved |
| [0008](0008-multi-video-composition-and-playback-model.md) | Multi-video surfaces: GALLERY gains `VIDEO_GRID`; playback is one discriminated mode (`CLICK_TO_PLAY` / `AUTOPLAY_VISIBLE` / `AUTOPLAY_ALWAYS`) with derived flags; forced-muted autoplay; system-bounded concurrency | Approved |

All eight were approved on 2026-09-21.

**Schema note.** ADR-0006 and ADR-0007 both specify deferred schema work that is
**not yet applied**. `db/schema.ts`, `db/migrations/` and `openapi.yaml` are
unchanged as of their approval — they are incomplete with respect to these ADRs,
not contradicted by them. See each ADR's "Deferred schema work" section.
