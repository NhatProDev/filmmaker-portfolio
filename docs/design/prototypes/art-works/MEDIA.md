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
Art Works 2C v2.dc.html             locked desktop candidate
art-works-2c-v2.md                  its review record
Art Works 2C v2 Responsive.dc.html  responsive derivative of the above
art-works-2c-v2-responsive.md       its validation record (three passes)
Art Works Directions.dc.html        exploration record — directions 2A / 2B / 2C v1
support.js                          prototype runtime support
```

**2C v2 is the selected candidate baseline. It is not approved.** Its own header
says so, and `page-specifications.md` §2 records Art Works as VISUALLY EXPLORED
— candidate on the desktop axis.

**A responsive derivative now exists.** `Art Works 2C v2 Responsive.dc.html`
validates the locked candidate from 1440 down to 375 at 3, 9 and 18 projects;
`page-specifications.md` §2.9 records Art Works as RESPONSIVE VALIDATED —
candidate on the responsive axis. **Neither axis is approved.**

**No historical desktop prototype was rewritten.** `Art Works 2C v2.dc.html` and
`art-works-2c-v2.md` are byte-identical to their committed versions (22,552 and
12,028 bytes), and still render project titles in Marcellus.

`Art Works Directions.dc.html` is **exploration evidence, retained as record**.
`art-works-2c-v2.md` supersedes its 2C v1 for review purposes; 2A and 2B are kept
so the alternatives that were considered remain visible. Do not treat any
direction in it as current.

`support.js` is byte-identical to the copies in every other prototype
directory. Each carries its own copy so the files render standalone. Its
modification time changed when the responsive derivative was produced; **its
content did not**, and Git correctly reports no change.

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

### Referenced by `Art Works 2C v2 Responsive.dc.html`

The same nine covers and six clips, **plus six further covers** used to build
the 18-project dataset: `desk-02.jpg`, `mtm-table.jpg`, `desk-05.jpg`,
`mtm-swatches.jpg`, `mtm-mannequin.jpg` and `mtm-portrait.jpg`. **All 15 covers
and all 6 clips resolve.** The portrait is `portrait.jpg` throughout; the stale
`about-portrait.png` does not appear.

---

## The responsive derivative

**Final structure** (`page-specifications.md` §2.9), all Art Works-specific:

```text
>= 1171px      locked count-aware desktop packer   ·  desktop index
700 – 1170px   JUSTIFIED_ROWS v2, verbatim         ·  per-row index
540 – 699px    Art Works PAIRS                     ·  per-row index
<  540px       JUSTIFIED_ROWS v2, verbatim, T = 1  ·  per-row index (one-up)
```

- **1171px desktop takeover** — the lowest width above which the locked packer
  passes at every count, for the current content.
- **540–699px pairs** — consecutive projects share one row height, widths from
  native aspect, no crop, no reordering, no portrait special case.
- **Below 540px, one frame per row.**

**Dynamic project names use a Newsreader-backed `font-display` preset.** The
"Works" heading stays Marcellus. Fonts are loaded from Google Fonts for evidence
only; production faces come from a self-hosted library (`design-system.md`
§1.1).

### Rejected probe states remain evidence only

The derivative keeps each rejected or superseded alternative reachable as a
comparison switch. **None of them is a candidate:**

| Switch | State | Why it is not the candidate |
|---|---|---|
| `sheet: verbatim` | `JUSTIFIED_ROWS` at desktop instead of the locked packer | the locked count-aware desktop is Owner-locked |
| `midBand: oneUp` | one-up at 540–699 | 51–65% more page height, two frames on screen |
| `midBand: portraitRow` | a portrait on its own row | a lone portrait took 60% of the screen; a special case |
| `narrowProbe: twoUp` | two-up below 540 | frames too small, plate scrim failed, identification weakened |
| `groupAt: 1024 / 700 / never` | a different index-grouping threshold | superseded — the index switches with the packer at 1171 |

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
