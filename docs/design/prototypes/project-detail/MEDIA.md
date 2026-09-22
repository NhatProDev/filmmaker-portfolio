# Project Detail Prototype Media — Manifest

- **Date:** 2026-09-22
- **Status:** Tracked manifest for **untracked** local runtime assets.
- **Assets live at:** `media/` (repository root)

This file is version-controlled. **The media it describes is not.**

It records what exists and where it lives. It changes no design rule, sets no
default, and carries no grade.

---

## Artifacts in this directory

```text
Project Detail 1B v2.dc.html     candidate baseline prototype
project-detail-1b-v2.md          its review record
Project Detail Directions.dc.html  exploration record — directions 1A / 1B / 1C
support.js                       prototype runtime support
```

**1B v2 is the selected candidate baseline. It is not approved.** Its own header
says so, and `page-specifications.md` §3 records it as VISUALLY EXPLORED —
candidate.

`Project Detail Directions.dc.html` is **exploration evidence, retained as
record**. `project-detail-1b-v2.md` supersedes its option 1b for review purposes;
1A and 1C are kept so the alternatives that were considered remain visible. Do
not treat any direction in it as current.

`support.js` is byte-identical to the copy in `../home/`. Each prototype
directory carries its own copy so the files render standalone.

---

## Runtime media

These prototypes load web derivatives from the repository-root `media/`
directory. They reference no media of their own.

`media/` is **local prototype runtime media** — generated web-sized derivatives,
not sources. It is gitignored (`/media/`) and a fresh clone will not contain it;
it must be restored manually. The distinction between it and `imgs & videos/`
(local source / working media) is recorded in `../home/MEDIA.md`.

Relative paths resolve as `../../../../media/` from this directory. Do not
rewrite them unless they are demonstrably broken.

### Referenced by `Project Detail 1B v2.dc.html`

```text
media/clips/c1.mp4          primary film (hero, CLICK_TO_PLAY)
media/clips/n3.mp4          supporting loop (AUTOPLAY_VISIBLE)
media/w/mtm-table.jpg       hero poster
media/w/mtm-mannequin.jpg   supporting-loop poster
media/w/mtm-atelier.jpg     justified row
media/w/mtm-shopfront.jpg   justified row
media/w/mtm-sketch.jpg      justified row
media/w/mtm-swatches.jpg    justified row
media/w/mtm-portrait.jpg    full-bleed coda
```

### Additionally referenced by `Project Detail Directions.dc.html`

```text
media/clips/c2.mp4
media/clips/n4.mp4
media/w/desk-04.jpg
```

Roles above are read from each asset's use in the markup. **No mapping is
asserted between these derivatives and the source filenames in
`imgs & videos/`** — that mapping is unrecorded and unverified, exactly as
`../home/MEDIA.md` and `../home/home-baseline-v2.md` §2 both state. Do not infer
one from filenames.

---

## Carried media observations

Recorded from `project-detail-1b-v2.md`. **Evidence, not specification.**

- **Poster / film `fit` mismatch.** The hero poster renders `COVER` and the film
  plays `CONTAIN`, so pressing play reframes. Unresolved; see
  `page-specifications.md` §3.8 item 2.
- **Letterbox on `c1` is visible** inside the contained frame. Left untreated on
  purpose — `design-system.md` §13 forbids shipping CSS compensation, and the
  ingestion method is unresolved (§16 item 1).
- **Posters are unrelated stills, not frames from their own clips.** A content
  gap already on record, shared with Home.
