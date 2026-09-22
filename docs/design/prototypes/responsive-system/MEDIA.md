# Responsive System Prototype Media — Manifest

- **Date:** 2026-09-22
- **Status:** Tracked manifest for **untracked** local runtime assets.
- **Assets live at:** `media/` (repository root)

This file is version-controlled. **The media it describes is not.**

It records what exists and where it lives. It changes no design rule, sets no
default, and carries no grade.

---

## This directory is not a page

Every other directory under `docs/design/prototypes/` holds the evidence for one
public surface. **This one holds cross-page responsive *system* evidence** —
behaviour shared across pages, independent of any page that uses it.

Nothing here is a page candidate, and nothing here composes a page.

It currently holds two experiments:

| Experiment | Subject | Status |
|---|---|---|
| **`JUSTIFIED_ROWS` narrow width** | a shared GALLERY presentation mode | SHARED RESPONSIVE CANDIDATE — SYSTEM VALIDATED (`design-system.md` §11.7) |
| **Display typography scaling** | how display type is sized against its container | SHARED RESPONSIVE CANDIDATE — SYSTEM VALIDATED (`design-system.md` §1.4) |

Neither is Design Approved, production-ready or page-validated.

---

## Artifacts in this directory

```text
Justified Rows Narrow Width v2.dc.html   selected shared responsive candidate
justified-rows-narrow-width-v2.md        its validation record
Justified Rows Narrow Width.dc.html      v1 — rejected / comparison evidence
justified-rows-narrow-width.md           v1's record
Display Typography Scaling.dc.html       display-typography measurement instrument
display-typography-scaling.md            its validation record
support.js                               prototype runtime support
```

**v2 is the selected shared responsive candidate. It is not approved.** Its own
header says so. `design-system.md` §11.7 records `JUSTIFIED_ROWS` as **SHARED
RESPONSIVE CANDIDATE — SYSTEM VALIDATED**, which is a system-level grade: no
page has been validated with it.

**v1 is retained unchanged as rejected / comparison evidence.** It holds the
sequence-average reference that v2 replaced, and the starved-cell failure of the
desktop-as-is algorithm. Both are the reason v2 exists, and deleting either
would remove the record of why the fixed reference was chosen. **Do not treat v1
as current, and do not maintain it forward.**

**No page candidate was modified** to produce either artifact.

`support.js` is byte-identical to the copies in `../home/`, `../art-works/`,
`../project-detail/`, `../about/`, `../contact/` and `../private-gate/`. Each
prototype directory carries its own copy so the files render standalone.

---

## Runtime media

Both prototypes load web derivatives from the repository-root `media/`
directory. They reference no media of their own, and no clips — the mode under
test is exercised with stills only.

`media/` is **local prototype runtime media** — generated web-sized derivatives,
not sources. It is gitignored (`/media/`) and a fresh clone will not contain it;
it must be restored manually. The distinction between it and `imgs & videos/`
(local source / working media) is recorded in `../home/MEDIA.md`.

Paths are constructed at runtime rather than written literally: the prototypes
hold bare filenames and prepend `../../../../media/w/`. Resolving a reference
therefore means joining the base and the filename.

### Referenced by v2 — the current candidate, from `media/w/`

```text
mtm-atelier.jpg     portrait.jpg      desk-01.jpg
mtm-shopfront.jpg   desk-03.jpg       mtm-table.jpg
nike-court.jpg      mtm-sketch.jpg    desk-04.jpg
mtm-swatches.jpg    nike-lacing.jpg   mtm-portrait.jpg
desk-05.jpg         mtm-mannequin.jpg
```

Fourteen distinct files. `portrait.jpg` serves two dataset slots — `portrait`
at declared aspect 0.645 and `aboutP` at declared 0.647.

### v2 resolution status — **14 / 14 resolve**

**v2 runtime media resolves completely. No empty media well remains in v2.**
Verified 2026-09-22 against the runtime media set on disk.

**Runtime asset correction (Project Owner, 2026-09-22).** v2's `aboutP` entry
previously referenced `media/w/about-portrait.png`, which is not present in the
runtime set and rendered as an empty well. **`media/w/portrait.jpg` is the
corrected asset** — the same correction `../art-works/MEDIA.md` already records
for Art Works, which hit the identical stale filename.

The prototype retains a **provenance comment** naming the old filename and
explaining why the declared aspect was left alone. **That comment is commentary,
not a runtime dependency**: `img.src` is built solely from each item's `src`
field, so nothing in a comment can reach the runtime path. It is intentional and
stays.

**The declared aspect stays 0.647, and that is deliberate** — it keeps the
geometry under test identical, so no table, boundary or conclusion moves.

`portrait.jpg` measures **970 × 1505, true aspect 0.6445**. The declared 0.647
therefore differs from the file by **0.39%**, inside the native-aspect audit's
2% tolerance, and the cell still reports `✓`. Recorded precisely: **0.647 is now
a geometry test constant, not a measurement of the asset behind it.** If this
prototype is ever re-used to validate real content rather than geometry, that
entry should be re-measured.

**Nothing else changed.** Aspect ratios in these prototypes are **declared
data**, not measured from the files — each item is authored as
`{ src: "…", ar: … }` and the packer consumes `ar`; nothing reads
`naturalWidth` or `naturalHeight`. Every computed result — target height, row
boundaries, floor and ceiling checks, the starved-cell count, the source-order
audit and the native-aspect audit — was independent of whether that one image
loaded, which is why the correction moved no finding.

### Referenced by v1 — historical, **14 / 15 resolve**

**v1 still references `media/w/about-portrait.png`, and that is correct.** v1 is
retained byte-identical as rejected / comparison evidence, so it keeps the stale
reference it was built with. **Do not correct it** — rewriting rejected evidence
to match current state would destroy the record of what was actually run.

Its one unresolved reference has the same non-consequence as above: v1's
findings are aspect-driven and unaffected. Its remaining fourteen files are the
v2 set listed above.

---

## Display Typography Scaling — no media dependency

**The display-typography experiment depends on no runtime media of any kind.**

| Dependency | Count |
|---|---|
| Images (`img`, `picture`, `source`) | **0** |
| Video / audio (`video`, `audio`) | **0** |
| References to `media/` | **0** |

It is a **measurement instrument**, not a composition: 4 sizing strategies ×
4 representative compositions × 3 faces × 5 strings × 7 widths, reporting
**measured glyph advances** for the real loaded face. Its only external
dependency is the three display faces themselves, loaded from Google Fonts by
the prototype and awaited via `document.fonts.ready` before measuring.

**Nothing needs restoring in a fresh clone for this experiment** — like
`../private-gate/`, it renders completely without `media/`.

Its JavaScript measurement exists **only as evidence**. The selected production
method is pure CSS (`clamp()` plus container query units), and
**JS shrink-to-fit is rejected as the production sizing model**
(`design-system.md` §1.4).

---

## Geometry probes are not media

Aspect ratios the library cannot supply are exercised as **labelled geometry
probes** — ruled boxes drawn by the prototype, carrying their ratio as text.
They reference no file and are **never invented imagery**.

```text
2.39   2.20   0.80   0.72   0.67   0.56   0.50
```

The library holds nothing wider than 2.041 and nothing taller than 0.645, so the
extremes could not be exercised with real assets. **`design-system.md` §16 item
15 carries this as remaining uncertainty**: the rule is aspect-driven and should
hold, but a real cinematic master should be run through it before specification.

---

## No mapping to source media

**No mapping is asserted between these derivatives and the source filenames in
`imgs & videos/`.** That mapping is unrecorded and unverified, exactly as
`../home/MEDIA.md` and `../home/home-baseline-v2.md` §2 both state. Do not infer
one from filenames.

---

## Carried media observations

Recorded from `justified-rows-narrow-width-v2.md`. **Evidence, not
specification.**

- **The mode is exercised with stills only.** There is no video anywhere in
  either prototype, so the interaction between `JUSTIFIED_ROWS` and
  `AUTOPLAY_VISIBLE` — specifically Art Works' one-preview-at-a-time policy
  meeting one-up rows below 700px — **remains untested**. Carried as
  `design-system.md` §16 item 16.
- **Native aspect is preserved and nothing is cropped.** Every cell's rendered
  ratio is within 2% of its source ratio, audited per cell at every tested
  width and count.
- **Cover aspect is load-bearing**, as `../art-works/MEDIA.md` also records. The
  packer needs each item's aspect before layout; supplying it late means the
  first paint reflows. Ingestion must supply it.
