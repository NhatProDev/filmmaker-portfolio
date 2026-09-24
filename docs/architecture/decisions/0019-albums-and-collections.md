# ADR-0019 — Albums and collections

- **Status:** Approved. The owner requested it in the Phase 3C brief (3C-1).
- **Date:** 2026-09-24
- **Related:** ADR-0002 (ordering), ADR-0003 (private projects), ADR-0005
  (insertion), ADR-0011 (contextual alt), ADR-0012 (publishing), ADR-0014
  (media)
- **Change class:** New tables, new REST resources and new public routes
  (CLAUDE.md §20).

## Problem

Stills that are not a project — a series, a trip, a body of photographs — have
no home in the site. A project composition is the wrong container. It carries
facts, credits, an opening and a "next project" chain, and it sits in the
Works index.

## Decision

### 1. An album is an ordered set of Media Library images

```text
albums         id, slug (unique), title, description, collection,
               status (DRAFT | PUBLISHED | ARCHIVED), cover_media_id,
               project_id, display_position, seo_title, seo_description,
               published_at, created_at, updated_at, deleted_at
album_media    id, album_id, media_id, position, alt_text, caption
album_publications   album_id, snapshot, published_at, published_by
```

- Items are **IMAGE** assets only. Video in justified rows is deferred; see
  `docs/architecture/content-system.md` §8.
- Items are ordered by an integer `position`, contiguous from 0. Insertion
  follows ADR-0005. Reordering is one request carrying the complete set, in one
  transaction (ADR-0002).
- `alt_text` is contextual: `NULL` inherits, `''` is decorative (ADR-0011).
  `caption` is plain text.
- `cover_media_id` is an optional IMAGE. Without one, the first item is the
  cover.
- Removing an item removes only the reference. Deleting an album is a soft
  delete. Media Library assets are never deleted.
- Every relational reference — item, cover, published snapshot — participates
  in `MEDIA_IN_USE`.

### 2. Collections are a grouping, not an entity

`albums.collection` is a short label, like `projects.category`. The public
index groups albums by collection, in order of first appearance. A collection
has no page of its own. Promoting collections to an entity is a later change
if collections ever need their own copy or cover.

### 3. Project relationship

`albums.project_id` optionally names a related project. Like a project's slug
and visibility, it is **live**, not snapshotted. The album page links to the
project only while that project is published and PUBLIC. A PRIVATE project is
never named or linked (ADR-0003).

### 4. Publishing

Working copy → Publish → one current snapshot (ADR-0012). The snapshot holds
the album's editorial fields, its items and their media records. Publish
refuses an album with no items. `publication_media` gains `album_id` so that
live media stay protected.

### 5. Visibility: public only

V1 albums are PUBLIC. A private album would need a second password gate and
access cookie. That is a change to the private-access model (CLAUDE.md §20),
so it is deferred rather than improvised.

### 6. Public routes

- `/albums` lists the published albums in display order, grouped by
  collection. It answers 404 while none is published.
- `/albums/<slug>` shows one album: its title, description, a related-project
  link, and its images in justified rows.

Both pages are static and revalidated on publish. `src/proxy.ts` routes
`/albums/<slug>` as it routes `/works/<slug>`: unknown slugs get the
prerendered 404, and an admin preview renders a never-published album.

Neither route is added to the site navigation, the Works index or Home by
default. Their visual design uses the existing public system (type values,
tiers, `JustifiedRows`). The page design itself is new and needs the owner's
design review before albums are promoted anywhere.

## Why

- A small typed model beside projects, not inside them. The composer stays
  for pages that are compositions, and an album is a sequence.
- Albums reuse the project machinery: publication, in-use, ordering,
  insertion, proxy routing and revalidation.

## Compatibility impact

Additive. No existing endpoint, DTO or page changes.

## Migration impact

`0010` creates the three tables and adds `publication_media.album_id`. The
single-owner check is replaced with the three-owner form. That replacement is
a constraint change that every existing row already satisfies.

## Alternatives considered

- **Albums as projects of a special kind.** Rejected: it has the magic-row
  problem ADR-0007 rejected for Home.
- **Albums as pages with a GALLERY block.** Rejected: it creates pages with
  slugs (ADR-0007 constraint 3) to hold one block.
- **A collections table.** Deferred until collections need their own content.
