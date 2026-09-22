# Home Prototype Media — Manifest

- **Date:** 2026-09-22
- **Status:** Tracked manifest for **untracked** local assets.
- **Assets live at:** `imgs & videos/` (repository root)

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
and the prototype that produced it is missing (see below). **The mapping between
these filenames and that observation is unverified.**

---

## Relationship to the missing prototype

`design-handoff.md` cites two evidence sources that **do not exist** in this
repository or anywhere searched:

```text
Home Baseline.dc.html   "source of truth for the visuals"
home-baseline.md        "test findings and their evidence"
```

**Neither has been recreated, and neither should be fabricated.**

This directory — `docs/design/prototypes/home/` — is the proposed canonical
location for those artifacts **if they are recovered**. It currently contains
this manifest only.

If the prototype is recovered, place it here and re-verify its measurements
before any of them is promoted out of "reported but unverifiable" status. See
`design-system.md` §0.1 for how the missing evidence affects rule grading, and
§17 for the rules that were downgraded because of it.

---

## Scope

This manifest records **what exists and where it lives**. It changes no design
rule, sets no default, and carries no grade. Media behaviour is specified in
`design-system.md` §7–§9; page-level media behaviour in
`page-specifications.md`.
