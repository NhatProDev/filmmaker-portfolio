# ADR-0003 — PRIVATE projects are excluded from the public listing

- **Status:** Approved
- **Date:** 2026-09-21
- **Decided by:** Project Owner / Software Architect
- **Affects:** `openapi.yaml` (`GET /public/projects`, `PublicProjectSummary`) · CLAUDE.md §6
- **Change class:** DTO semantics change (CLAUDE.md §20)

## Problem

CLAUDE.md §6 states:

> Private project blocks/media must not be returned until project access is
> verified.

The REST contract read this narrowly, as covering *block* media only. It
therefore allowed PRIVATE projects to appear in the anonymous public listing as
"locked summaries", carrying:

- `cover` — a complete `Media` object, including its public `url`
- `shortDescription`
- `year`
- `category`
- `requiresPassword: true`

A project cover **is** media. So the contract either violated §6 or relied on an
unstated narrow reading of it. For a portfolio whose private projects are
typically unreleased client work under embargo, publishing the cover frame and
a description of an embargoed project to anonymous visitors is a real
confidentiality leak, not a theoretical one.

## Current behaviour before this decision

```yaml
# GET /public/projects
'200':
  description: Public project summaries. Private projects may appear as locked summaries.
```

`PublicProjectSummary.requiresPassword` was a required boolean, present
specifically to mark these locked entries.

## Decision

**PRIVATE projects are not enumerated publicly in V1.**

The public listing filter becomes:

```sql
status = 'PUBLISHED' AND deleted_at IS NULL AND visibility = 'PUBLIC'
```

A PRIVATE project is reachable **only** through its direct project URL. The
visitor arrives already holding that URL, receives `403` with an error envelope
carrying no project content, is prompted for the project password, and calls
`POST /public/projects/{slug}/access`.

No field of a PRIVATE project — cover, short description, year, category,
title, blocks or media — may appear in any public listing response before
access is verified.

**Consequent change:** `PublicProjectSummary.requiresPassword` was **removed**.
With PRIVATE projects excluded, it could only ever be `false`; retaining a
permanently-false field in a canonical contract is misinformation, and its
presence implies locked entries are expected.

## Why

- Removes the ambiguity in §6 rather than leaving two defensible readings in the
  top-precedence document.
- Matches the actual confidentiality expectation of password-protected client
  work: a private project should not advertise its own existence, title or
  key art.
- Enumeration is itself disclosure. A locked card tells an anonymous visitor
  that a project exists, roughly what it is, when it was made and who it might
  be for — often the sensitive part.
- Simplifies the V1 public surface: one listing shape, one access path, no
  partial-disclosure tier to get subtly wrong.

## Compatibility impact

No client code exists, so no runtime breakage.

`PublicProjectSummary` is a **narrowing** change: one required field removed.
`additionalProperties: false` means a stale client expecting
`requiresPassword` will find it absent rather than falsely `false`.

`GET /public/projects/{slug}` is **unchanged** — it already returned `403` for a
locked private project. Only its documentation was sharpened to state that the
403 body carries no project content and that this is now the sole route to a
private project.

## Migration impact

None. No schema change. `projects.visibility` already exists with the
`projects_visibility_idx` index, and `projects_public_order_idx` covers
`(status, deleted_at, display_position)`.

Implementation note: the public listing query now also filters on `visibility`.
If listing performance ever warrants it, `projects_public_order_idx` could be
extended to include `visibility` — not required for V1 volumes, and explicitly
out of scope here.

## Forward path

A "show private project as locked card" feature is **deferred, not rejected**.
If approved later it would:

1. Re-introduce `requiresPassword` to `PublicProjectSummary`.
2. Add an explicit per-project opt-in flag, so listing a private project is a
   deliberate act rather than a default.
3. Define precisely which fields a locked card may expose — almost certainly
   title and slug only, not cover media.

It is **not** V1.

## Alternatives considered

**Keep locked cards but strip `cover` only.** Rejected: title, description, year
and category still disclose the existence and nature of embargoed work.

**Keep locked cards behind a per-project opt-in flag.** Rejected for V1 as
scope: it needs a new column, new admin UI and new validation. Recorded above as
the forward path.

**Return `404` instead of `403` on direct access to a locked private project.**
Rejected: the visitor legitimately holds the URL and must be told a password is
required. `403` is correct per CLAUDE.md §10, which assigns 403 to "locked
private project reads".
