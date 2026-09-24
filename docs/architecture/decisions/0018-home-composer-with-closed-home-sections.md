# ADR-0018 — Home composer with closed Home sections

- **Status:** Approved. The owner requested it in the Phase 3C brief (3C-2).
- **Date:** 2026-09-24
- **Related:** ADR-0007 (page-owned compositions), ADR-0008 (playback),
  ADR-0013 (presets), CLAUDE.md §13 ("Home — composer-driven")
- **Change class:** Relaxes the fixed five-slot Home template to a composition
  of Home's own sections. No schema change.

## Problem

Home's blocks are already page-owned rows (ADR-0007). The public projection,
however, accepts exactly five blocks in one order: hero, identity, wall, about
teaser, coda. The Studio edits them as five fixed slots. The administrator
cannot reorder, duplicate or remove a section, which CLAUDE.md §13 requires.

The brief also requires that the existing Home stay reproducible exactly and
not be redesigned. The generic block renderer draws Project Detail's dark room,
and Home has no approved dress for generic blocks.

## Decision

### 1. Home is an ordered composition of Home sections

A top-level Home block renders as one of five closed **Home sections**,
recognised by type and preset. Each one is drawn by Home's locked CSS:

| Section | Stored as |
|---|---|
| Hero | `HERO`, `AUTOPLAY_AMBIENT` video over its poster, with a caption |
| Identity | `GRID` preset `homeIdentity`: display, lead and aside texts |
| Wall | `GALLERY` `VIDEO_GRID` preset `homeWall`, `AUTOPLAY_VISIBLE` |
| About teaser | `GRID` preset `homeAbout`: body text, link line, portrait |
| Frames | `GALLERY` `JUSTIFIED_ROWS` with a label |

Sections may appear in any order and may repeat, with these rules:

- the hero appears **at most once and only first**. It is the single
  standalone ambient surface (ADR-0008);
- the identity appears **exactly once**, because it carries the page's `h1`;
- hidden blocks are never published.

Any other block on Home — generic text, columns, images, other gallery modes —
is **refused at Publish, with the reason**. The Studio does not offer it.
Opening generic blocks on Home is a design review, not an engineering choice.

### 2. No data migration

The current published Home is already this composition, in the canonical
order, so its working copy, snapshot and rendered markup are unchanged. The
projection generalises from "five slots" to "a list of sections". For the
current content it produces the same view model, in the same order.

### 3. Studio

`/admin/home` uses the same composer as Project Detail, owned by the page
instead of a project: outline, drag and keyboard reorder, insert, duplicate,
hide and show, delete, and a preview at three widths. Its insert menu offers
exactly the five Home sections, created whole in one request. Sections keep
their internal structure: the composer offers no moves out of a Home preset
and no extra children in it.

The footer is site chrome, not a section (ADR-0017 §4).

## Why

- It meets "reorder, replace, remove, duplicate or reconfigure without code"
  (CLAUDE.md §13) without inventing any visual design.
- Every arrangement renders from locked CSS, so no layout can look
  unapproved. The worst case is a sequence the owner chose.

## Compatibility impact

None on stored data or the REST contract. The `HomeContent` view model becomes
a list of sections plus the footer, which is internal to the renderer.

## Alternatives considered

- **Generic blocks on Home, drawn by the Project Detail renderer.** Rejected:
  it would bring the dark room onto a light page. That is a redesign.
- **A new light dress for generic blocks.** Deferred: it is new visual design
  and needs the owner's design review.
- **Keep the five-slot editor.** Rejected by the brief.
