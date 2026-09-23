# ADR-0011 — Content and domain extensions

- **Status:** Approved
- **Date:** 2026-09-24
- **Decided by:** Project Owner / Software Architect (Phase 2 architecture report, with Director clarifications)
- **Related:** ADR-0006 (composer), ADR-0007 (page ownership), ADR-0009 (posters), ADR-0010 (HERO overlay), ADR-0014 (media)
- **Affects:** CLAUDE.md §6, §12, §14 · `db/schema.ts` · `db/migrations/` · `openapi.yaml` (deferred)
- **Change class:** Database table/relationship redesign (CLAUDE.md §20)

## Problem

The locked public frontend renders content that the approved schema has no
place for:

1. Project Detail's fact list shows **Role** and **Runtime**. `projects` has
   neither.
2. Art Works plays a **moving preview** for some projects. Whether a preview is
   an explicit per-project choice was an open data question
   (page-specifications.md §2.7); there is no relation for it.
3. Blocks carry **editorial content** — a statement, a caption, a gallery
   label, an identity line, a link. `project_blocks.config` is
   presentation-only (CLAUDE.md §6), so there is nowhere legitimate to store the
   words.
4. **Alt text depends on the use.** The same portrait is "Portrait of the
   filmmaker" on Home and decorative elsewhere; the same still is described in
   one place and decorative in another. `media.alt_text` alone cannot say that.

## Current behaviour before this decision

All of it is held in `src/content/*` and read through the static content
gateway. The database cannot represent it.

## Decision

### 1. Project fields

- `projects.role varchar(200)` — the owner's role on the project, as displayed.
- `projects.runtime varchar(100)` — the runtime **as displayed** ("8 min"). It
  is editorial text, not a duration type: the display string is what the owner
  authors.

No other project field is added. `subtitle`, `location` and a project-type enum
have no consumer and are not introduced.

### 2. Works moving preview

`projects.preview_media_id uuid NULL REFERENCES media(id) ON DELETE SET NULL`.

A moving preview is an **explicit per-project choice**, not inferred from "a
clip exists". It is a relational reference, like the cover, and therefore
participates in `MEDIA_IN_USE`. Both `cover_media_id` and `preview_media_id`
are indexed, because the in-use query reads them on every media deletion.

### 3. Block editorial content: `content`, separate from `config`

`project_blocks.content jsonb NOT NULL DEFAULT '{}'`.

| Column | Holds | Examples |
|---|---|---|
| `content` | **editorial data** | paragraphs, a caption, a gallery label |
| `config` | **presentation and layout** | preset, column placement, playback mode, fit |

JSONB is a storage format, not the contract. **Nothing crosses the application
boundary as arbitrary JSON:** each block type has its own schema, and content
and config are validated as a discriminated union on the block type, on write
and on read. Unknown keys are rejected.

`content` never holds:

- media identity — media stays relational through `block_media` (§6, §12);
- colour or typeface values (§13);
- the project title — it resolves from `projects.title` (ADR-0010).

TEXT content is itself discriminated by `kind`:

- `richText` — authored paragraphs of inline runs (text, emphasis, link);
- `projectFacts` and `projectCredits` — **derived**: they author no text and
  render the project's own fields, exactly as the HERO overlay renders
  `projects.title` (ADR-0010). Valid only on project-owned blocks.

### 4. Contextual alt text

| Where | Meaning |
|---|---|
| `media.alt_text` | The asset's **default** description |
| `block_media.alt_text` | The **placement's** override: `NULL` inherits the default, `''` marks a decorative use, any other value replaces it |

Resolution for a placement: **placement override → asset default → `''`**.
`alt=""` is valid and deliberate for decorative placements. Until publish
validation exists (Phase 2E), an unresolved alt falls back to decorative;
publish validation will require an explicit choice for every placement.

### 5. Not decided here

- About and Contact stay static in V1 (CLAUDE.md §19). No About, Contact or
  SiteSettings persistence is introduced.
- The corresponding `openapi.yaml` DTO additions (`role`, `runtime`,
  `previewMediaId`, block `content`, placement `altText`) are deferred to the
  phase that implements the REST handlers.

## Why

- **Two typed columns over a JSON bag for role and runtime**, because they are
  ordinary scalar project facts with a single display each.
- **A foreign key for the preview**, because a preview is a media relationship
  and §6 keeps those relational; it must also block deletion of the clip.
- **`content` beside `config`**, because the alternative — words in `config` —
  breaks the one rule that keeps theme changes from rewriting content (§13), and
  a table per block type would duplicate the block model ADR-0006 and ADR-0007
  deliberately kept single.
- **Alt on the placement**, because accessibility meaning is contextual; an
  asset-only alt forces the wrong description into some uses.

## Compatibility impact

Additive. `openapi.yaml` is not contradicted — block `config` is already an open
object at the contract level, and none of the new fields are in any DTO yet.

## Migration impact

Migration `0002` adds the columns and indexes. No existing data is rewritten.

## Implementation constraints

1. Validate block `content` and `config` with the per-type schemas on write and
   on read; reject unknown keys.
2. Reject derived TEXT kinds on blocks that are not project-owned.
3. Extend the `MEDIA_IN_USE` query to `preview_media_id`, alongside
   `cover_media_id`, `block_media.media_id` and `media.poster_media_id`
   (ADR-0009).
4. Never store an authored title, colour, typeface or media id in `content`.

## Alternatives considered

**Content inside `config`.** Rejected: §6 reserves `config` for presentation.

**One table per block type.** Rejected: duplicates the single block model.

**Alt only on the asset.** Rejected: cannot express decorative-here,
described-there.

**Infer the Works preview from any attached clip.** Rejected: the owner must be
able to choose, and "a clip exists" is not a choice.
