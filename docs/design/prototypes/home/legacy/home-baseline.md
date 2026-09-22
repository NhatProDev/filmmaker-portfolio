# Home — approved baseline (Density B)

Status: macro layout and density frozen. Reopen only if a real-content review
exposes a clear issue.

Design file: `Home Baseline.dc.html`. Prior exploration preserved in
`Home Concept.dc.html` (v1), `Home Concept v2.dc.html`, `Home Concept v3.dc.html`.

## Frozen block sequence

| # | Block | Presentation | Playback |
|---|---|---|---|
| 1 | HERO / VIDEO | full bleed, 76vh | `AUTOPLAY_ALWAYS` |
| 2 | GRID, 12 col | display type fit to span + two TEXT children | — |
| 3 | GRID, asymmetric | 3 VIDEO (cols 1–7, 8–12, 5–7) + 1 TEXT (cols 1–4) | `AUTOPLAY_VISIBLE` |
| 4 | GALLERY | `HORIZONTAL_STRIP`, 6 covers at 2:3, clipped both edges | `AUTOPLAY_VISIBLE` |
| 5 | GALLERY | `JUSTIFIED_ROWS`, 6 stills, native aspect | still |
| 6 | TEXT | About entry point | — |

Header and footer are site chrome, not blocks.

## Alternative component

`GALLERY / VIDEO_GRID`, 8 tiles at 16:9, 4 / 2 / 1 columns across
desktop / tablet / mobile. It **replaces** block 3; the two are mutually
exclusive and must never sit adjacent on the same page. Enforced in the design
file by the `mainField` switch.

## Band spacing

`--band: clamp(72px, 9vw, 170px)` between media sections.

Design rule behind it: **one moving field per viewport height**, where a
tight-gutter wall counts as a single field. The failure mode found in the
density test was not video count but two differently-shaped moving fields
co-visible in one viewport. This is a minimum-gap constraint the composer can
enforce between adjacent media blocks.

## Typography and palette

Unchanged from v3. Display fit to grid span in container-width units (`cqw`),
so "oversized" is a ratio of the span, not a pixel value, and it survives
reorder, respan and mobile stacking without a breakpoint table.

Presets remain switchable: Title card, Plate, Monograph, Festival.
Palettes: Bone & vermilion (default), Silver gelatin, Tungsten.

## Promoted to V1 requirement

**`media.poster_media_id`** — relational self-reference on `media`, with the
CLAUDE.md §12 `MEDIA_IN_USE` check extended to cover it. Previously deferred in
ADR-0008 §7.

Rationale confirmed by the density test: posters are what a visitor actually
sees during fast scroll, autoplay refusal, the released state of the
`AUTOPLAY_VISIBLE` lifecycle, and under `prefers-reduced-motion`. On the strip
and the wall the poster *is* the composition most of the time. An
auto-generated first frame may be a black frame, a slate, or motion blur.

Must not be stored as a media UUID in `config` — that hides the reference from
the in-use check.

## Under consideration

**Focal point / crop on poster media.** The same cover is framed at 2:3 in the
strip, 2.39:1 and portrait in the asymmetric grid, and 16:9 in the wall. A
centre crop will decapitate some of them. Shape to evaluate: a normalised
`focalX` / `focalY` pair (0–1) on the media row, applied as `object-position`,
so one poster survives every container without per-container crops.

The design file exercises this: each slot supports pan and scale, and the
framing persists — drop one cover into several surfaces and the mismatch is
visible immediately.

## Deferred

**Overlap / edge-clipped display type** (v2 `heroVariant: Overlap`). Needs GRID
to allow two children on one row with overlapping column ranges and a bounded
two-layer stacking order. Not a V1 blocker.

## Real-content review 1 — 14 frames placed

Source: 14 stills. Tailoring atelier (8), Nike court (2), an unattributed
desk/archive set (4). Originals in `media/`, web derivatives in `media/w/`.

**Density and band spacing: unchanged.** Real footage is busier than the
placeholders were, and the 72–170px band still holds. No change recommended.

**Typography scale: unchanged.** The wordmark against real atelier footage
reads correctly at the current span ratio.

**Poster crops: the finding of this pass.** Every frame supplied is 16:9 or
2:1. There is no portrait source material at all. Two surfaces demand it —
the 2:3 strip cover and the portrait cell in the asymmetric grid — so both are
currently a centre crop out of a wide frame. The Nike cover degrades to an
abstract teal field with a partial shoe. This is the case for
`focalX`/`focalY`: a centre crop is wrong for roughly half the library.

**Asset pipeline.** Full-resolution PNGs (3839px, several MB each) stalled the
page outright. Derivatives at 1000–1800px fixed it. Ingestion must generate
web renditions; originals are not servable on a wall.

**Strip item count.** Three projects no longer overflowed the viewport, so the
clipped-at-both-edges signal disappeared. Card width was widened from
`clamp(200px,20.5vw,372px)` to `clamp(260px,33vw,600px)` to restore it. This
makes card width a `HORIZONTAL_STRIP` setting the administrator tunes against
item count, not a fixed value. Not a macro change.

**Still outstanding:** a Tokyo cover (its strip slot is deliberately empty),
and a project name for the desk/archive set.

## Video capability — added 2026-09-22

The drop targets were **image-only**. `image-slot` accepts image files and
rejects video, and there was no `<video>` element anywhere in the prototype.
Extended without touching macro layout, density, band spacing, typography or
section structure.

What was added:

- A `<video data-film>` layer on the four video-capable surfaces (hero, and the
  three cells of the asymmetric grid), sitting **above** the poster
  `image-slot` and **below** the caption.
- Poster fallback is structural, not scripted: the video fades in over the
  poster on successful play, and reverts to `opacity: 0` on pause, release,
  refusal, poster review, or reduced motion. The poster is always underneath.
- Drag-and-drop of a local video file onto any media surface attaches it for
  the session (`URL.createObjectURL`). A surface with no `<video>` gets one
  created and registered in the lifecycle on first drop.
- The placeholder drift animation **stops** on any surface carrying real video.
  It was only ever a stand-in.
- Diagnostics extended: `playing / video / refused / prepared / released / off`.

### Bug found and fixed during the test

`setPlay()` was the only thing that started playback, and it only ran on
IntersectionObserver **transitions**. `AUTOPLAY_ALWAYS` surfaces are skipped by
both observers, so the hero's state was set once at mount and never revisited —
a video source arriving after mount (a drop, or a CMS-rendered source) never
started. Probe confirmed `readyState 4`, no error, and a manual `play()`
succeeding: the element was simply never asked.

Fix: `setPlay` is now called for every surface at mount including
`AUTOPLAY_ALWAYS`, and every film binds a `canplay` handler that re-drives the
lifecycle when a source lands. **This is a requirement for the production
renderer**, not a prototype quirk — any implementation that drives playback
purely from intersection events will have the same defect.

## Real-video test — 2026-09-22

Four clips, all 1280×720 H.264. Assignment: hero `c3` (Nike court, 4.4s),
asymmetric 2.39:1 `c1` (Made to Measure, 8.0s), asymmetric portrait `c4`
(Nike sneaker, 1.2s), asymmetric 3:2 `c2` (Tokyo, 2.2s). Wall tiles cycle all
four. Third project renamed from "Untitled, 2026" to **Tokyo**.

**Every clip carries baked-in letterbox.** `c1` is 2.34:1 content inside a 16:9
file (87px bars top and bottom); `c2`–`c4` are 2.0:1 with ~40px bars. Plain
`object-fit: cover` therefore renders black bars *inside* the frame. The
prototype compensates with a scale factor (`trimLetterbox`, on by default) —
that is a workaround, not an answer. Ingestion must either detect and strip
letterbox on upload or store an active-area crop per asset.

**Poster/video scale mismatch.** Posters are full-frame stills; videos are
scaled to trim bars. The poster→video swap produces a visible ~12% scale jump
on `c1`. Whatever trims the video must trim the poster identically.

**Performance is not the constraint.** 9 simultaneous 720p streams (8 wall
tiles + the always-on hero) held 33fps with 3 dropped frames in 1221 (0.25%).
The hero keeps decoding while off-screen because `AUTOPLAY_ALWAYS` specifies
`pauseOffscreen: no` — it is the 9th stream and buys nothing. Recommend
releasing even `AUTOPLAY_ALWAYS` beyond a generous margin.

**Clip length is a design constraint nobody has written down.** `c4` at 1.2s
and `c2` at 2.2s read as GIFs rather than footage when looped in a large cell.
Minimum usable loop is around 4 seconds; below that the cut becomes the subject.

## Second clip batch — 2026-09-22

Four more clips, 1280×720, **no letterbox** (a different export than batch one).
`n1` 10.5s warm product film (mean R−B = +41), `n2` 7.1s desk/archive interior,
`n3` 2.6s garment factory, `n4` 2.4s interview/podcast setup.

`n2` identifies the previously unattributed desk stills as a real project. It
still has no title; captioned "Untitled (desk film)" until named.

`n4` is not used. Flat frontal lighting, static frame, microphone and lockers —
it reads as a video-platform upload, not a film, and would undermine A9 on the
one page that has to establish the opposite.

### Sequence revised

    HERO (n1, AUTOPLAY_ALWAYS)
    → GRID identity (wordmark + two TEXT children)      quiet
    → GALLERY VIDEO_GRID, 3 x 3, six video + three still
    → TEXT About entry, large negative space            quiet
    → GALLERY JUSTIFIED_ROWS, stills                    coda
    → footer

The horizontal strip is now optional (`includeStrip`, default off). With three
projects it restated what the main field already said. The About block moved
above the stills gallery so the page ends on media rather than on type.

**Wall settles at 3 columns, nine cells, five moving and four still.** Nine
into three removes the orphan row that eight into three produced, and the four
still tiles are rest points inside the cluster — the thing that keeps it reading
as a contact sheet rather than a feed.

`n2` is deliberately **not** in the wall. It opens on near-black, and in a small
tile a large share of its 7.1s loop reads as a hole in the grid rather than as
low-key footage. It stays in the tall asymmetric cell, where the dark opening
reads as intended. A general rule worth recording: **a clip whose opening
seconds are near-black cannot go in a small tile** — it needs either a large
cell or a trimmed in-point. This is a second, independent argument for
administrator-selected posters.

**Hero clip changed from `c3` to `n1`.** `c3` (teal court) was striking but its
saturation fought the vermilion wordmark directly beneath it. `n1` is the only
warm-graded clip in the library and belongs with the bone ground. Colour now
arrives later in the page, from the work, not from the opening frame.

**Performance note.** Seven concurrent streams (six wall tiles plus the
always-on hero) measured ~22fps with 1.2% dropped frames, against 0.25% at nine
streams of the shorter batch-one clips. Releasing `AUTOPLAY_ALWAYS` beyond a
generous margin is now a performance recommendation, not just a tidiness one.

## Portrait — 2026-09-22

Supplied as a re-upload of reference 2; the photograph itself is the small 5:8
frame at its top right, extracted and upscaled to `media/w/portrait.jpg`
(970×1505). **Provenance warning: this is a crop out of a screenshot, not a
master file.** It is soft at display size and must be replaced with the
original before launch.

Placed as an **IMAGE child of the About GRID at cols 10–12, row 1, vertical
alignment `end`** — bottom-aligned with the "More about Nhat" baseline, with
the width of the grid left empty between it and the statement.

Rejected placements: near the hero (competes with the ambient film and makes
the page about the author rather than the work, against A1); as a tile in the
`VIDEO_GRID` (a face in a contact sheet reads as a cast list, and 16:9 would
crop it badly); as a large vertical counterpoint to a wide video (gives the
author equal weight to the work).

Responsive note: at mobile the safe stack would render it full width, which
turns it into a profile photo. It carries `data-mobile-width="half"` — a width
mode in ADR-0006 §4's placement vocabulary, not a hack — capping it at 56%.
That is the one placement property this composition needs beyond column spans.
