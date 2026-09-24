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
| [0006](0006-responsive-visual-layout-composer.md) | Responsive Visual Layout Composer: GRID becomes a 12-column composition container, one level of block nesting, fixed desktop/tablet/mobile breakpoints with mobile safe-stacking | Approved — extended by 0008 and 0010 |
| [0007](0007-page-owned-block-compositions.md) | Blocks may be owned by a `pages` singleton so Home is composer-driven; one shared block model, not a parallel table | Approved — §2 SQL clarified by 0015 |
| [0008](0008-multi-video-composition-and-playback-model.md) | Multi-video surfaces: GALLERY gains `VIDEO_GRID`; playback is one discriminated mode (`CLICK_TO_PLAY` / `AUTOPLAY_VISIBLE` / `AUTOPLAY_AMBIENT`) with derived flags; forced-muted autoplay; system-bounded concurrency | Approved |
| [0009](0009-administrator-selected-poster-media.md) | Administrator-selected posters are a V1 requirement, held relationally as `media.poster_media_id` and covered by `MEDIA_IN_USE` | Approved — amended by 0015 |
| [0010](0010-bounded-project-hero-title-overlay.md) | HERO gains a bounded **intra-block** title overlay: title resolves from `projects.title`, never authored in config; closed presentation config; dismissal on **media activation**; `CLICK_TO_PLAY` or IMAGE only | Approved |
| [0011](0011-content-and-domain-extensions.md) | Project `role`, `runtime` and `preview_media_id`; typed block editorial `content` separate from presentation `config`; contextual alt (asset default, placement override, `''` decorative) | Approved |
| [0012](0012-draft-and-published-state.md) | Working copy → explicit publish → one current published snapshot → public read; not revision history; tables arrive with the workflow in Phase 2E | Approved |
| [0013](0013-templates-typed-blocks-and-presentation-presets.md) | Hybrid: typed blocks persist, templates seed and are not live-linked, closed code-defined presentation presets own responsive derivations; strict exactly-one-owner | Approved |
| [0014](0014-media-architecture.md) | Media identity is provider + key with checksum, URLs derived at read time, originals separate from future variants, providers behind adapters, private media not publicly delivered | Approved — §3 amended by 0015 |
| [0015](0015-placement-poster-override-and-contract-realignment.md) | Poster = asset default + optional relational placement override, both in `MEDIA_IN_USE`; strict single-owner wording; `0001` baseline provenance; `openapi.yaml` realigned to the domain | Approved |
| [0016](0016-baked-in-letterbox-policy.md) | Baked-in letterbox: clean masters first; a stored, closed-enum active area per asset for files that cannot be re-exported; no automatic detection in V1 | Approved (delegated, Phase 2G-A) — to be confirmed at review |
| [0017](0017-cms-managed-about-contact-and-site-settings.md) | About, Contact and site settings become keyed pages with strict structured `content` and relational `page_media` slots, published like Home; static content is the fallback until first publish; no Contact form | Approved (Phase 3C brief) |
| [0018](0018-home-composer-with-closed-home-sections.md) | Home is an ordered composition of five closed Home sections (hero first and once, identity once); generic blocks on Home refused pending design review; no data migration | Approved (Phase 3C brief) |
| [0019](0019-albums-and-collections.md) | Albums: ordered IMAGE sets with contextual alt and captions, a `collection` label for grouping, an optional live related-project link, draft/publish, PUBLIC only; `/albums` and `/albums/<slug>` outside the navigation | Approved (Phase 3C brief) |
| [0020](0020-private-uploads-and-storage-provider-realignment.md) | Uploads take `audience`; private originals live under `private/` with no public URL; a rehearsed script realigns `storage_provider` on rows and snapshots in one transaction | Approved (Phase 3C brief) |

ADRs 0001–0008 were approved on 2026-09-21; ADR-0009 and ADR-0010 on
2026-09-22; ADR-0011 to ADR-0015 on 2026-09-24. ADR-0016 was decided on
2026-09-24 under the owner's Phase 2G-A delegation. ADR-0017 to ADR-0020 record
the owner's Phase 3C brief of 2026-09-24.

**Schema note.** The deferred schema work of ADR-0006, ADR-0007 and ADR-0009 is
applied, together with ADR-0011 and ADR-0014's additions, in migration
`db/migrations/0002_*.sql`. The HOME page row is seeded by `0003`, and ADR-0015's
placement poster is added by `0004`. ADR-0010 adds no schema. ADR-0012's
publication tables arrive with the publish workflow. `openapi.yaml` was realigned
to the domain by ADR-0015.
