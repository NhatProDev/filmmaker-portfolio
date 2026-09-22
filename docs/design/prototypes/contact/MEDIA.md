# Contact Prototype Media — Manifest

- **Date:** 2026-09-22
- **Status:** Tracked manifest for **untracked** local runtime assets.
- **Assets live at:** `media/` (repository root)

This file is version-controlled. **The media it describes is not.**

It records what exists and where it lives. It changes no design rule, sets no
default, and carries no grade.

---

## Artifacts in this directory

```text
Contact 4B v2.dc.html        candidate baseline prototype
contact-4b-v2.md             its review record
Contact Directions.dc.html   exploration record — directions 4A / 4B v1
support.js                   prototype runtime support
```

**4B v2 is the selected candidate baseline. It is not approved.** Its own header
says so, and `page-specifications.md` §5 records Contact as VISUALLY EXPLORED —
candidate.

`Contact Directions.dc.html` is **exploration evidence, retained as record**. 4A
and 4B v1 remain exactly as explored; they are not maintained forward. Do not
treat either direction as current.

`support.js` is byte-identical to the copies in `../home/`, `../art-works/`,
`../project-detail/` and `../about/`. Each prototype directory carries its own
copy so the files render standalone.

**Cited but not present:** `contact-4b-v2.md`'s header lists
`contact-directions.md` as retained record. That file is **not in this
directory**. It has not been recreated and must not be fabricated. If it is
recovered, this directory is its canonical location.

---

## Runtime media — one optional dependency

Contact has the lightest media dependency of any page: **one image, and the page
is designed to work without it.**

| Asset | Role | Status |
|---|---|---|
| `media/w/mtm-shopfront.jpg` | Identity still, margin element | **Optional and provisional** |

**1 / 1 resolves** in both the candidate and the Directions artifact. No clips.
Contact uses no moving media.

`media/` is **local prototype runtime media** — generated web-sized derivatives,
not sources. It is gitignored (`/media/`) and a fresh clone will not contain it;
it must be restored manually. The distinction between it and `imgs & videos/`
(local source / working media) is recorded in `../home/MEDIA.md`.

### The identity still is not a dependency

**The still is borrowed from Art Works, where it is a project cover.** Its
caption in the prototype says so honestly: *"Provisional identity media — caption
to come."*

**It is not a permanent Contact dependency.** The prototype carries an
`identityMedia: present | absent` switch; with it absent the figure is removed
and the heading, statement, email block, metadata rows and closing note are
**pixel-identical**. Everything that carries meaning sits on the page's left
spine; the still occupies margin the composition does not need.

Both outcomes are valid: **replace** it with a Contact-specific working still at
any aspect — the margin is width-constrained, not height-constrained — or
**remove** it entirely.

**Do not invent unrelated replacement media.** Rendering is `width:100%;
height:auto`, so whatever asset is used keeps its native aspect.

---

## Publication-data gaps

**Every contact value in the prototype is prototype copy, not publication fact.**

Recorded by `contact-4b-v2.md` §0 decisions 12–13 and §7. These are
**publication/content gaps. They are not architecture blockers, and they do not
block Contact reaching VISUALLY EXPLORED — candidate.**

1. **Email address** — currently invented.
2. **Instagram handle and Vimeo URL** — currently invented; social hrefs are
   placeholders.
3. **Location and travel values** — currently invented.
4. **Availability window** — currently invented.
5. **The reply-time statement** — currently invented, and it is **a promise**.
   Whether to make it at all is a decision, not a copy task.
6. **A Contact-specific identity still**, or a decision to ship without one.
7. **A true caption**, only if a still is used.

**Do not treat any current value as a publication fact.**

---

## No mapping to source media

**No mapping is asserted between these derivatives and the source filenames in
`imgs & videos/`.** That mapping is unrecorded and unverified, exactly as
`../home/MEDIA.md` and `../home/home-baseline-v2.md` §2 both state. Do not infer
one from filenames.
