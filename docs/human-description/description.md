# Human Description

I want to build a professional filmmaking portfolio website.

The public website should include:

- Home
- Art Works
- About Me
- Contact

The primary goal is to showcase filmmaking, cinematography, photography, and visual projects in a cinematic and editorial way.

Visitors do not need accounts or login.

They should be able to:

- browse public projects
- view project images and videos
- open private projects by entering a project-specific password

There is only one authenticated user type in V1:

- Admin

The admin should have access to a CMS where they can:

- create, edit, delete, publish, and archive projects
- upload and manage images and videos
- set projects as public or private
- assign a password to private projects
- build project pages using reusable layout blocks
- drag and reorder project blocks and media
- use image/video grids similar in spirit to Squarespace or Pixieset

The V1 builder should NOT be a fully free-form visual editor.

It should use structured layout blocks such as:

- hero media
- text
- image
- video
- gallery
- image grid
- spacer
- asymmetric layout presets

The public website should feel like an editorial filmmaking portfolio, not like a SaaS product or CMS dashboard.

Media should be the dominant visual element.

Project pages should be flexible enough to tell different visual stories instead of using one fixed template.

This document describes the human intent of the project.

Technical architecture, database design, API contracts, and implementation details are defined elsewhere and should take precedence where conflicts exist.

---

## Document provenance

Converted verbatim from `description.source.docx` on 2026-09-21. No wording was
added, removed, or reordered; hard line wraps inside sentences were joined so the
Markdown renders as the author intended.

`description.source.docx` is retained unchanged as the signed-off source of
record. If the two ever disagree, the `.docx` wins and this file must be
re-derived from it.

### How this document ranks

Under **CLAUDE.md §21 Design Governance**, this document is **Tier 3 — Human
Product Intent** in the visual design precedence order. It outranks external or
general design guidance and is outranked by approved project-specific design
specifications and by user-provided visual references in
[`references/`](references/INDEX.md).

The closing sentence above ("Technical architecture, database design, API
contracts, and implementation details … should take precedence") is a statement
about the **engineering** precedence order in CLAUDE.md §22. It does **not**
lower this document beneath external design guidelines. See CLAUDE.md §21.

### Open item recorded against this document

This document lists **"asymmetric layout presets"** as a layout block. It is not
a block type. Per **ADR-0004**, asymmetric layouts are expressed as `GRID` block
configuration presets. The canonical block types are `HERO`, `TEXT`, `IMAGE`,
`VIDEO`, `GRID`, `GALLERY`, `SPACER`. The intent is preserved; the mechanism
differs.
