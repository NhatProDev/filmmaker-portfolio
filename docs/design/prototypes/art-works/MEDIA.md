# Art Works Prototype Media — Manifest

- **Date:** 2026-09-22
- **Status:** Tracked manifest for **untracked** local runtime assets.
- **Assets live at:** `media/` (repository root)

This file is version-controlled. **The media it describes is not.**

It records what exists and where it lives. It changes no design rule, sets no
default, and carries no grade.

---

## Artifacts in this directory

```text
Art Works 2C v2.dc.html        candidate baseline prototype
art-works-2c-v2.md             its review record
Art Works Directions.dc.html   exploration record — directions 2A / 2B / 2C v1
support.js                     prototype runtime support
```

**2C v2 is the selected candidate baseline. It is not approved.** Its own header
says so, and `page-specifications.md` §2 records Art Works as VISUALLY EXPLORED
— candidate.

`Art Works Directions.dc.html` is **exploration evidence, retained as record**.
`art-works-2c-v2.md` supersedes its 2C v1 for review purposes; 2A and 2B are kept
so the alternatives that were considered remain visible. Do not treat any
direction in it as current.

`support.js` is byte-identical to the copies in `../home/` and
`../project-detail/`. Each prototype directory carries its own copy so the files
render standalone.

**Cited but not present:** `art-works-2c-v2.md`'s header lists
`art-works-directions.md` as retained record. That file is **not in this
directory**. It has not been recreated and must not be fabricated. If it is
recovered, this directory is its canonical location.

---

## Runtime media

These prototypes load web derivatives from the repository-root `media/`
directory. They reference no media of their own.

`media/` is **local prototype runtime media** — generated web-sized derivatives,
not sources. It is gitignored (`/media/`) and a fresh clone will not contain it;
it must be restored manually. The distinction between it and `imgs & videos/`
(local source / working media) is recorded in `../home/MEDIA.md`.

Paths are constructed at runtime rather than written literally: the prototypes
hold bare filenames and prepend `../../../../media/w/` for covers and
`../../../../media/clips/` for clips. Resolving a reference therefore means
joining the base and the filename. Do not rewrite either unless demonstrably
broken.

### Referenced by `Art Works 2C v2.dc.html`

Covers, from `media/w/`:

```text
mtm-atelier.jpg   nike-court.jpg    desk-01.jpg
desk-03.jpg       mtm-shopfront.jpg nike-lacing.jpg
mtm-sketch.jpg    desk-04.jpg       portrait.jpg
```

Clips, from `media/clips/`:

```text
n1.mp4   n2.mp4   n3.mp4   n4.mp4   c2.mp4   c3.mp4
```

### Referenced by `Art Works Directions.dc.html`

The same fifteen assets. It references nothing the candidate does not.

### Resolution status

**All 15 / 15 references resolve in both prototypes**, verified 2026-09-22
against the runtime media set on disk.

**Asset correction (Project Owner, 2026-09-22).** Project 9 "Sitting" previously
referenced `media/w/about-portrait.png`, which did not exist. It now uses
`media/w/portrait.jpg` — verified on disk at **970 × 1505, aspect 0.645**,
matching the aspect the prototype declares. The prototype's own record carries
this at `art-works-2c-v2.md` §9 item 4.

The change is **cover only**. Layout, ordering, aspect handling, interaction,
numerals, preview scheduling, packing order and transition behaviour are
unchanged — independently confirmed here by re-checking the prototype's
structural code and props, which are byte-for-byte in the same positions.

---

## No mapping to source media

**No mapping is asserted between these derivatives and the source filenames in
`imgs & videos/`.** That mapping is unrecorded and unverified, exactly as
`../home/MEDIA.md` and `../home/home-baseline-v2.md` §2 both state. Do not infer
one from filenames.

---

## Carried media observations

Recorded from `art-works-2c-v2.md`. **Evidence, not specification.**

- **Cover aspect is load-bearing.** `JUSTIFIED_ROWS` needs cover dimensions
  before layout or the first paint reflows. Ingestion must supply them (§7).
- **Preview eligibility is currently inferred** from whether a clip exists.
  Whether a moving preview should be an explicit per-project choice is an open
  data question, not a decided one (§7).
- **Boolean media attributes are unreliable when renderer-written.** `loop`,
  `muted` and `playsInline` are set as properties — the same class of finding as
  `../home/home-baseline-v2.md` §8.1 (§9).
