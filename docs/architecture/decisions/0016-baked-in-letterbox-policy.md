# ADR-0016 — Baked-in letterbox policy

- **Status:** Approved — decided under the Project Owner's Phase 2G-A
  delegation ("resolve the architecture decision for baked-in letterboxing;
  prefer the simplest reliable filmmaker workflow"). To be confirmed at the
  owner's review of the Phase 2G-A report.
- **Date:** 2026-09-24
- **Related:** CLAUDE.md §12, ADR-0009 §5 (poster and video must match),
  ADR-0014 (media architecture), `design-system.md` §7.5 and §16 item 1,
  `design-handoff.md` "Letterbox"
- **Affects:** CLAUDE.md §12 · `db/schema.ts` (later, additive) · the Studio's
  media library (later)
- **Change class:** Resolves an open requirement; no contract change now
- **Implementation:** Phase 3B. Migration `0008`, `activePicture` on the
  Media DTO, the Studio's Picture area control, and the generic Project Detail
  renderer. See `docs/architecture/project-composer.md` §5. Phase 3D
  extended it to `JUSTIFIED_ROWS` in project galleries and albums, where a
  row tile already takes each asset's own aspect
  (`docs/architecture/launch-review.md` §2). The locked opening, the presets
  and Home are not yet covered (constraint 4 and Decision 4).

## Problem

Some source files carry letterbox bars inside the frame: 2.34:1 or 2.0:1
picture inside a 16:9 file. Under `COVER` the bars render as black bands inside
the composed frame. The Project Detail hero film `c1` has 87px bars top and
bottom (active picture ≈ 2.344 inside 1.778), so 21–24% of a standard hero is
encoded black.

CLAUDE.md §12 requires a structural solution, forbids one-off CSS scaling, and
requires that whatever is done applies identically to a poster and its video.
It left the method open between detect-and-strip at ingestion and a stored
active-area crop.

## Options compared

| | A. Preserve as-is | B. Stored active area | C. Automatic detection at ingest |
|---|---|---|---|
| What it is | Render the file as encoded | The asset records where its picture is; the renderer frames only that | A server decodes each upload, finds the bars (e.g. `ffmpeg cropdetect`) and strips or records them |
| Meets §12 | No — bars stay inside `COVER` frames | Yes — one rule, from data, for every surface | Yes |
| Poster = video | n/a | Yes: each asset declares its own area, so a frame grab with bars and a clean still both land on the same picture | Yes, if run on both |
| Filmmaker effort | None | One choice per affected asset, only when a clean export is impossible | None |
| Engineering | None | One nullable column, one closed enum, one renderer rule | A decode pipeline the architecture does not have: uploads go browser → storage directly (§12), so a worker, a queue and ffmpeg would be new infrastructure |
| Failure modes | Visible bars | A wrong choice is visible in the Studio preview and reversible | Dark scenes, fades and title cards defeat detection; re-encoding loses quality and changes checksums |

## Decision

1. **Clean masters first.** The supported workflow is to upload files without
   baked bars: export the active picture at its own aspect ratio (a 2.39:1
   film is a 2.39:1 file). This is what a filmmaker's grading or editing tool
   already does, costs nothing, and needs no pipeline. The Studio's upload
   guidance states it.
2. **A stored active area for files that cannot be re-exported** (a client
   delivery, an archive master). The asset records its picture's aspect ratio
   inside the frame as a **closed enum** — e.g. `FULL` (default), `2.39`,
   `2.00`, `1.85` — with the picture centred vertically, which is how
   letterbox is encoded. It is:
   - a property of the **asset**, held relationally on `media` (never in block
     `config`, CLAUDE.md §6), so every placement of the asset agrees;
   - applied by the renderer to **each layer from that layer's own asset**:
     a video and its poster each declare their own area, so the poster-to-video
     swap frames the same picture and never jumps (ADR-0009 §5);
   - a data-driven rule of the renderer, identical on every surface — not a
     per-page or per-asset CSS value.
3. **No automatic detection in V1.** It would need a server-side decode
   pipeline that the direct-upload architecture deliberately avoids, and it is
   least reliable on exactly the dark, graded material a filmmaker uploads. If
   a pipeline is added later, detection may **suggest** a value for the same
   field; the field remains the contract.
4. **Default is unchanged.** An asset without an active area renders as it is
   encoded. The locked Project Detail hero (`c1`, `COVER → COVER`, bars left as
   encoded — `page-specifications.md` §3.9) is therefore unchanged by this
   decision. Setting an active area on a locked-page asset is a visual change
   and goes through design review like any other.

## Why

- The simplest reliable workflow is the one filmmakers already use: export
  what you mean. The stored area covers the exception without a pipeline.
- A closed enum keeps the choice to four readable options and keeps arbitrary
  crop geometry (the Figma-canvas failure mode, CLAUDE.md §13) out of the data.

## Compatibility impact

None now. When implemented: one nullable column on `media` (additive
migration), one optional field on the Media DTO, and the renderer rule.

## Migration impact

None now. Later: an additive migration; existing assets default to `FULL`.

## Implementation constraints

1. Never store the active area in block or placement `config`.
2. Never compensate bars with per-page or per-asset CSS values (§12).
3. The renderer applies an asset's area to that asset's own layer only.
4. The Studio shows the chosen area on the asset's preview, so a wrong choice
   is visible before publishing.

## Alternatives considered

**A only (preserve).** Rejected: it is the condition §12 exists to prevent.

**C (automatic detection).** Rejected for V1; see Decision 3.

**Free crop rectangle per asset.** Rejected: letterbox is centred and
standardised; free geometry adds authoring surface without covering a real
case.
