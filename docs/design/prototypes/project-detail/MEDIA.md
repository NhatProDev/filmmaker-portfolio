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
Project Detail 1B v2.dc.html             locked desktop candidate
project-detail-1b-v2.md                  its review record
Project Detail 1B v2 Responsive.dc.html  responsive derivative of the above
project-detail-1b-v2-responsive.md       its validation record (three passes)
Project Detail Directions.dc.html        exploration record — directions 1A / 1B / 1C
support.js                               prototype runtime support
```

**1B v2 is the selected candidate baseline. It is not approved.** Its own header
says so, and `page-specifications.md` §3 records it as VISUALLY EXPLORED —
candidate on the desktop axis.

**A responsive derivative now exists.** `Project Detail 1B v2 Responsive.dc.html`
validates the locked candidate from 1440 down to 375;
`page-specifications.md` §3.12 records Project Detail as RESPONSIVE VALIDATED —
candidate on the responsive axis. **Neither axis is approved.**

**The locked desktop candidate is not modified by it.** `Project Detail 1B
v2.dc.html` and `project-detail-1b-v2.md` are byte-identical to their committed
versions (17,557 and 9,880 bytes).

`Project Detail Directions.dc.html` is **exploration evidence, retained as
record**. `project-detail-1b-v2.md` supersedes its option 1b for review purposes;
1A and 1C are kept so the alternatives that were considered remain visible. Do
not treat any direction in it as current.

`support.js` is byte-identical to the copies in every other prototype
directory. Each carries its own copy so the files render standalone. Its
modification time changed when the responsive derivative was produced; **its
content did not**, and Git correctly reports no change.

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

### Referenced by `Project Detail 1B v2 Responsive.dc.html`

The same film, loop and stills as the desktop candidate. **All references
resolve.** The four stills are built at runtime from bare filenames, as in
`../art-works/`.

Roles above are read from each asset's use in the markup. **No mapping is
asserted between these derivatives and the source filenames in
`imgs & videos/`** — that mapping is unrecorded and unverified, exactly as
`../home/MEDIA.md` and `../home/home-baseline-v2.md` §2 both state. Do not infer
one from filenames.

### Runtime media differences in the responsive derivative

**In each case the historical desktop artifact keeps what it had — history is
not rewritten to match the derivative.**

| | Historical desktop artifact | Responsive derivative |
|---|---|---|
| **Stills — aspect data** | authored `data-ar` values **`1.5 / 0.8 / 2.39 / 1.33`**, which **do not match the real files** | **native aspects** `2.041 / 2.012 / 2.041 / 2.041`, the real files (`mtm-sketch`, `mtm-shopfront`, `mtm-atelier`, `mtm-swatches`) |
| **Stills — layout** | one row, cropped | a **structured GRID**, 4 / 2 / 1 columns, native aspect, no crop (`page-specifications.md` §3.12) |
| **Hero poster** | `mtm-table.jpg`, an unrelated still | **a frame of `c1` itself, captured at runtime** — see below |
| **Hero fit** | poster `COVER`, film `CONTAIN` — reframes on play | **`COVER → COVER`** — same fit idle and playing |

The stale still aspects are retained in the derivative as a **`probe`** set for
geometry comparison only; the default is `real`. **Native-aspect correctness
overrides pixel equivalence with stale geometry**, as it did for Home's coda.

### The runtime-captured film frame is validation evidence only

To test poster-to-playback continuity without a matching poster asset, the
derivative draws `c1` to an in-memory canvas at a sampled time and uses the
result as the poster. **It is held only as an in-memory data URL. No file is
written, no asset is created, and nothing under `media/` is altered.**

- **No captured runtime frame becomes a production poster asset.**
- It proves one thing: **when the poster shares the film's geometry and `fit`,
  activation does not reframe** (×1.000). That is the requirement a production
  poster must meet.
- A production poster is an ADR-0009 administrator-selected `IMAGE` held as
  `media.poster_media_id` — and **it must match the film's playback geometry**
  to preserve seamless activation.

### Dynamic project names use Newsreader

The derivative sets the HERO project title and the next-project title in
**Newsreader**, because Marcellus as served lacks Vietnamese glyph coverage and
falls back per glyph inside words. Fonts are loaded from Google Fonts for
evidence only; production faces come from a self-hosted library
(`design-system.md` §1.1). See `page-specifications.md` §3.12 and
`design-system.md` §16 item 20.

---

## Carried media observations

Recorded from `project-detail-1b-v2.md`. **Evidence, not specification.**

- **Poster / film `fit` mismatch** — *as recorded from the desktop candidate:*
  the hero poster rendered `COVER` and the film played `CONTAIN`, so pressing
  play reframed. **Now resolved for this page as `COVER → COVER`**
  (`page-specifications.md` §3.9 item 2).
- **Letterbox on `c1`** — measured from pixels as **87px top and bottom, 0
  sides**. Left untreated on purpose — `design-system.md` §13 forbids shipping
  CSS compensation, and the ingestion method is unresolved (§16 item 1). Under
  `COVER`, 21–24% of a standard hero is still encoded black.
- **Posters are unrelated stills, not frames from their own clips.** A content
  gap already on record, shared with Home.
