# ADR-0017 — CMS-managed About, Contact and site settings

- **Status:** Approved. The owner requested it in the Phase 3C brief
  (3C-3, 3C-4, 3C-10, 3C-12), which reverses the V1 scoping recorded below.
- **Date:** 2026-09-24
- **Related:** ADR-0007 (page-owned compositions), ADR-0011 §5, ADR-0012
  (draft and published state), ADR-0014 (media), CLAUDE.md §13, §19
- **Supersedes:** in part, CLAUDE.md §19 ("CMS-managed About Me content",
  "no About table, no About API"), ADR-0007 §4 (About and Contact outside the
  `pages` set) and ADR-0011 §5 (no About, Contact or SiteSettings persistence).
  The Contact form, its API, a persistence table for messages and any delivery
  integration **remain out of scope**.
- **Change class:** Database table/relationship addition; new REST resources
  (CLAUDE.md §20).

## Problem

About and Contact are committed content files, so every word change needs a
developer and a deploy. The owner wants them edited in the Studio with the same
draft → publish model as projects and Home. The contact email appears in three
places (Home footer, About, Contact) and would drift if edited three times.

The locked pages must not change. Their editorial structure — About's
statement, portrait, biography, evidence, process, designed placeholder,
experience and availability; Contact's statement, email, rows, note, identity
still and footer — is a design, not a sequence of generic blocks. Forcing it
into blocks would either lose that structure or need page-specific presets
that are blocks in name only.

## Decision

### 1. Structured page content, not blocks

About, Contact and the site settings are **keyed singleton pages** in the
existing `pages` table (ADR-0007): `ABOUT`, `CONTACT` and `SITE`. Migration
`0009` seeds them idempotently. `HOME` is unchanged.

`pages.content jsonb NOT NULL DEFAULT '{}'` holds each page's editorial
content. It is validated by a **strict per-key schema**. The schema is closed,
unknown keys are rejected, and it holds no colour, typeface or layout value
(CLAUDE.md §13). The column is a storage format, as for block `content`
(ADR-0011). HOME's content stays `{}`: Home is its block composition.

| Key | Content (summary) |
|---|---|
| `ABOUT` | marker, lead, portrait caption, biography paragraphs, evidence caption and answer, process line and caption, the designed placeholder (label, caption, line), experience heading and rows (year + inline text with emphasis), availability line |
| `CONTACT` | heading, statement, email label and reply line, rows (label, value, optional link), note, identity caption (the still is optional) |
| `SITE` | name, role line, primary email, footer note, copyright line |

### 2. Page media are relational

`page_media (page_id, slot, media_id, alt_text)` places one Media Library asset
in a named slot, unique per page and slot. Slots are closed per key: `ABOUT`
has `portrait`, `evidence` and `process`; `CONTACT` has `identity`. `alt_text`
follows ADR-0011: `NULL` inherits the asset's default, `''` is decorative.

Media ids never appear in `content`. `page_media` participates in
`MEDIA_IN_USE`, and a published page's media are recorded in
`publication_media` like Home's.

### 3. Publishing

Each page has its own working copy and one current snapshot in
`page_publications` (ADR-0012). The snapshot is
`{ version, content, slots, media }`. **Until a page is first published,
the public site renders its committed static content**, as Home did before
its first publish. Cutover is therefore an explicit publish, and the static
files stay as the fallback until then.

### 4. Site settings

`SITE` holds only values that appear on more than one page:

- the primary email (Home footer, About, Contact);
- the footer note (Home);
- name, role line and copyright (the Contact footer).

Each consumer reads the published `SITE` snapshot, or the committed defaults
before its first publish. Navigation, metadata templates, the wordmark and
every secret or environment value stay in code (`server-env.ts`). A setting is
added only when a second page needs it.

### 5. Links

Contact rows may link to an https URL, a `mailto:` address, a site path, or a
fragment (`#`, as the approved prototype's placeholder links do). Nothing else
is accepted.

## Why

- **One page model, not a page builder.** Keyed rows reuse the `pages` table,
  page publication, `publication_media`, preview and revalidation. No slugs,
  no admin-created pages.
- **Structured content keeps the locked design.** Every field maps to one
  element the page already renders, so parity is exact by construction.
- **Relational media** keep `MEDIA_IN_USE` truthful (CLAUDE.md §6, §12).

## Compatibility impact

- Additive: one column, one table, three seeded rows, and page routes for the
  new keys. `GET /pages/HOME` is unchanged.
- The public pages render identically. About and Contact images are served
  from the Media Library asset with the same bytes (checksum match), so their
  `src` can change while their pixels do not.

## Migration impact

`0009` is additive. The static import (3C-12) creates each page's working
copy and slots from the committed content files. It is create-only and
idempotent, and it reuses an existing asset whose checksum matches. Nothing
becomes public until an admin publishes.

## Alternatives considered

- **Generic blocks with About/Contact presets.** Rejected: the presets would
  carry the whole page, with blocks in name only.
- **Dedicated `about` and `contact` tables with typed columns.** Rejected: they
  would duplicate the publication, preview and in-use machinery that keyed
  pages already have.
- **Settings in environment variables.** Rejected for editorial values; kept
  for secrets and deployment configuration.
