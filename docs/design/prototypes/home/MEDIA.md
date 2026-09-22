# Home Prototype Media — Manifest

- **Date:** 2026-09-22
- **Status:** Tracked manifest for **untracked** local assets.
- **Assets live at:** `imgs & videos/` and `media/` (both repository root)

This file is version-controlled. **The media it describes is not.**

---

## Why this media is not in Git

The footage in `imgs & videos/` is **local working / prototype media**, used for
Home visual and media testing — video wall cell behaviour, autoplay and poster
behaviour, aspect-ratio and letterbox handling, and clip-length review.

It is deliberately excluded from version control, via `.gitignore`:

```text
imgs & videos/
```

Three reasons:

1. **It is working material, not a source-controlled fixture.** These are
   exploration inputs, not assets the application depends on to build or run.
2. **Size.** 56.6 MB across 8 files, and Git stores every revision of a binary
   in full. Iterating on footage in-repo makes history grow without bound.
3. **Production media does not belong in Git at all.** Per CLAUDE.md §12, media
   is uploaded browser-to-object-storage through signed upload authorization and
   referenced by the `media` table. **The eventual home for production video is
   object storage, not this repository** — so committing prototype footage would
   establish exactly the wrong pattern.

This mirrors how the tier-2 visual references are handled: the images live
locally and `docs/human-description/references/INDEX.md` is their tracked
manifest. Same policy, same reason.

---

## A fresh clone will not have these files

**Cloning this repository does not give you this media.** The directory will be
absent, and anything that expects it will find nothing.

To work on Home media behaviour, **the assets must be restored manually** from
wherever the owner keeps them, into `imgs & videos/` at the repository root,
under the filenames below.

Do not substitute different footage silently. Several recorded observations are
specific to these clips — clip length, opening-frame darkness, and baked-in
letterbox all vary per file, and swapping the set invalidates them.

---

## Current contents

As of 2026-09-22 — 8 files, 56.6 MB total.

| File | Size |
|---|---|
| `portfolio00108000.mp4` | 15.3 MB |
| `portfolio00376499.mp4` | 10.1 MB |
| `portfolio00776438.mp4` | 3.7 MB |
| `portfolio00777948.mp4` | 3.7 MB |
| `Timeline 1_00086720.mp4` | 11.5 MB |
| `Timeline 1_00106545.mp4` | 3.1 MB |
| `Timeline 1_00129604.mp4` | 6.5 MB |
| `Timeline 1_00337284.mp4` | 2.7 MB |

The two filename groups suggest two separate export batches. This matters
because `design-handoff.md` reports that **one clip batch carried baked-in
letterbox and the other did not** — but that report does not name which files,
and it has not been re-verified against the prototypes now in this directory.
**The mapping between these filenames and that observation is unverified.**

---

## Two local media tiers — sources and runtime derivatives

There are now **two** untracked local media directories at the repository root.
They are different things and must not be conflated.

| Directory | Tier | What it holds |
|---|---|---|
| `imgs & videos/` | **Local source / working media** | The original camera/export footage. Review material; the inputs derivatives are made from. Nothing renders from it directly. |
| `media/` | **Local prototype runtime derivatives** | Web-sized clips and stills that the prototype `.dc.html` files load at runtime. Generated artifacts, not sources. |

Both are gitignored (`imgs & videos/` and `/media/`). Both must be restored
manually in a fresh clone. Neither is a production asset store — production media
lives in object storage per CLAUDE.md §12.

`media/` contains `clips/` (H.264 web clips), `w/` (web-sized still
derivatives), and full-size stills at its top level. The prototypes reference
`clips/` and `w/` only.

**The mapping between `media/` derivatives and the `imgs & videos/` filenames
above is not recorded anywhere and remains unverified.** `home-baseline-v2.md`
§2 states the same. Do not infer a mapping from filenames.

---

## Relationship to the prototypes

**The prototypes are present.** This directory holds the current Home evidence
and the superseded legacy prototype:

```text
Home Baseline v2.dc.html     current Home prototype
home-baseline-v2.md          its validation report
support.js                   prototype runtime support
legacy/Home Baseline.dc.html superseded, retained as record
legacy/home-baseline.md      superseded, retained as record
legacy/image-slot.js         legacy dependency, not used by v2
legacy/support.js            legacy runtime support
```

`legacy/` was previously reported missing. It has since been placed here. Only
its relative media paths were rewritten (`./media/` → `../../../../../media/`)
so the archived file still renders from this location, plus a provenance comment
above `<x-dc>`; **no finding, value or design markup was altered**
(`home-baseline-v2.md` §0).

Measurements in the legacy report remain **historical**. `home-baseline-v2.md`
§8.3 records one correction worth carrying: with no CSS letterbox compensation
there is **no poster-to-video scale jump** — the reported ~12% jump was produced
*by* the workaround, not by the assets.

Note that `design-system.md` §0.1 and `design-handoff.md` still describe the Home
prototype as missing. Those statements predate this directory and have not been
revised here.

---

## Scope

This manifest records **what exists and where it lives**. It changes no design
rule, sets no default, and carries no grade. Media behaviour is specified in
`design-system.md` §7–§9; page-level media behaviour in
`page-specifications.md`.
