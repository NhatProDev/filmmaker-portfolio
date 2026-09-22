# About Me Prototype Media — Manifest

- **Date:** 2026-09-22
- **Status:** Tracked manifest for **untracked** local runtime assets.
- **Assets live at:** `media/` (repository root)

This file is version-controlled. **The media it describes is not.**

It records what exists and where it lives. It changes no design rule, sets no
default, and carries no grade.

---

## Artifacts in this directory

```text
About Me 3B v2.dc.html        candidate baseline prototype
about-me-3b-v2.md             its review record
About Me Directions.dc.html   exploration record — directions 3A / 3B v1 / 3C
support.js                    prototype runtime support
```

**3B v2 is the selected candidate baseline. It is not approved.** Its own header
says so, and `page-specifications.md` §4 records About Me as VISUALLY EXPLORED —
candidate.

`About Me Directions.dc.html` is **exploration evidence, retained as record**.
3A, 3B v1 and 3C remain exactly as explored; they are not maintained forward. Do
not treat any direction in it as current.

`support.js` is byte-identical to the copies in `../home/`, `../art-works/` and
`../project-detail/`. Each prototype directory carries its own copy so the files
render standalone.

**Cited but not present:** `about-me-3b-v2.md`'s header lists
`about-me-directions.md` as retained record. That file is **not in this
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

### Referenced by `About Me 3B v2.dc.html`

Three images, all from `media/w/`. **All 3 / 3 resolve.**

| Asset | Role in the candidate |
|---|---|
| `portrait.jpg` | Identity — the opening portrait |
| `desk-01.jpg` | Evidence — working method |
| `mtm-atelier.jpg` | Evidence — environment |

No clips. About uses no moving media.

`About Me Directions.dc.html` references four assets, all of which resolve.

---

## Portrait provenance

```text
media/w/portrait.jpg      native 970 × 1505      aspect 0.6445
```

Verified against the file itself, and matching what the prototype records.

**The portrait is an immutable visual asset.** The candidate renders it at
native aspect with width and automatic height only — **no crop, no zoom, no
reframe, no transform, no `object-fit: cover`, no `object-position`.** The
prototype carries a live audit that compares natural to rendered aspect and
inspects computed `object-fit`, printing `✗ ALTERED` if either diverges.

This is the same asset Home v2 uses for its About portrait, and the same one
`About Me Directions.dc.html` uses. **Do not modify the runtime media.**

---

## Missing publication assets

Recorded by `about-me-3b-v2.md` §7 and §0 decision 11. These are
**publication/content asset gaps. They are not architecture blockers, and they do
not block About reaching VISUALLY EXPLORED — candidate.**

1. **On set — operating.** ~3:2, the filmmaker working with the camera: hands
   and camera in the room rather than a posed portrait. The prototype holds a
   designed placeholder slot for it, which is the accepted interim state.
2. **A second, working portrait** distinct from the seated one.
3. **About-specific process imagery.** `desk-01` and `mtm-atelier` currently
   appear in Art Works as project covers. Acceptable for judging composition;
   for publication About should own its own frames.
4. **A master file for the portrait.** Separately recorded in
   `../home/home-baseline-v2.md` §9 — the current asset is a crop out of a
   screenshot and is soft at display size. Its aspect is correct; its resolution
   is the gap.

**Do not substitute unrelated media for any of these.**

---

## No mapping to source media

**No mapping is asserted between these derivatives and the source filenames in
`imgs & videos/`.** That mapping is unrecorded and unverified, exactly as
`../home/MEDIA.md` and `../home/home-baseline-v2.md` §2 both state. Do not infer
one from filenames.
