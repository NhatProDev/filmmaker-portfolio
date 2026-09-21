# Design Direction — Filmmaker Portfolio V1

- **Status:** Draft — Pending Design Exploration
- **Date:** 2026-09-21
- **Approval:** **Not approved.** Requires explicit Project Owner / Software
  Architect approval after Claude Design exploration concludes.
- **Precedence:** Intended to become Tier 1 — Approved project-specific design
  specification (CLAUDE.md §21) — **on approval, not before**.

Until it is approved, this document does **not** outrank the visual references,
the human product intent, or the external frontend-design guideline. It is the
working synthesis of Design Discovery plus the architect's locked decisions, and
it is the **input** to Design Exploration rather than its conclusion.

On approval it becomes the highest design authority in the project.

It governs **direction**, not implementation. It does not define a token scale,
component inventory, or page layout. Those belong to `design-system.md` and
`page-specifications.md`, neither of which exists yet.

Where this document says a decision is **reserved**, it is genuinely open. Do not
close it by inference during implementation — see §16.

---

## 1. Creative thesis

**The site is a projection room, not a product.**

A visitor arrives to look at moving images made by one person. Every decision
serves that act of looking. The interface is the architecture of a screening
room: it holds the work, directs attention to it, and otherwise gets out of the
way.

This produces three consequences that run through everything below.

**The work is the interface.** There is no layer of product chrome mediating
between the visitor and the films. Media runs to the edges of the viewport.
Navigation is a thin editorial line, not an application shell. The site does not
explain itself, badge itself, or sell itself.

**Restraint is the medium; one bold move is the message.** The page is quiet
almost everywhere so that a single gesture — an oversized clipped wordmark, a
full-bleed opening frame, a deliberate misalignment — can carry weight. Boldness
distributed evenly is boldness wasted. This is the one place where the external
guideline, the visual references and the brief agree without qualification.

**Entering a project changes the room.** Browsing surfaces are light, warm and
editorial: paper. A project page is dark: a cinema. That transition is the
site's signature structural idea, and it is not decoration — it is the moment
the site stops being a portfolio and becomes a screening.

The site must read as the work of a specific person in Hanoi who shoots, lights,
and grades — not as a template that a filmmaker filled in.

## 2. Emotional tone

| The site should feel | The site must never feel |
|---|---|
| Composed, deliberate, unhurried | Busy, animated, attention-seeking |
| Confident and quiet | Loud, salesy, promotional |
| Physical and printed — paper, ink, photographic grain | Synthetic, glossy, screen-native |
| Cinematic — light, shadow, grade, duration | Flat, diagrammatic, infographic |
| Editorial — considered sequencing, real negative space | Templated, gridded-by-default, filled-in |
| Personal and specific | Corporate, institutional, generic |

The register is a **printed film monograph** — an exhibition catalogue or a
photobook — that happens to move. Not a marketing site, not an app, not a
dashboard.

Tone is not a theme token. It is preserved regardless of which palette or
typeface combination the administrator selects. If a theme change makes the site
feel like a SaaS product, the theme system is wrong, not the tone.

## 3. Immutable design principles

These are **category A**. They are not configurable, not themeable, and not
subject to administrator preference. They survive every theme change. Violating
one is a design defect regardless of how the site is configured.

### A1 — Media-first

Media is the dominant visual element on every public page. Text supports media;
media never decorates text. On any public page where both appear, media holds
the larger share of the visual field.

### A2 — Restrained chrome

Interface furniture is minimal and recedes. No card containers, no elevation, no
decorative surfaces. Structural devices — rules, frames, numbering, labels —
appear only when they encode real information about the content. A device that
merely decorates is removed.

### A3 — Deliberate hierarchy

Every page has one clear primary element and an explicit order of attention.
Boldness is spent in one place per view. Nothing competes with the primary
element for the same weight.

### A4 — Asymmetry where appropriate

Composition may deliberately misalign, overlap, clip and offset. Asymmetry is an
available and encouraged tool — not a mandate. It is used where it creates
tension or hierarchy, not as a default arrangement, and never at the cost of
readability.

### A5 — Strong negative space

Emptiness is structural. Large unfilled regions are correct output, not wasted
space to be backfilled. Content is never expanded to fill a container.

### A6 — Native media presentation

Media keeps its own aspect ratio. Images and video are not cropped to a uniform
tile to make a grid regular. Mixed aspect ratios within a composition are
expected and are part of the editorial character.

### A7 — Cinematic project presentation

A project page presents the work as a screening: dark environment, full-bleed
primary film, supporting material subordinate and quiet.

### A8 — Editorial typography

Type is an active compositional element, not a neutral delivery vehicle. Body
text sits in a measured column with generous leading. Display type may be
treated as image.

### A9 — The public site is not a product UI

No pattern whose primary association is SaaS, admin tooling, or marketing
landing pages. This principle is the brief's own words and overrides
convenience.

### A10 — Accessibility floor

Responsive to mobile, visible keyboard focus, `prefers-reduced-motion`
respected, and text/background contrast meeting WCAG AA. This floor holds under
every theme configuration; it is not a value the administrator can trade away.

## 4. Default theme

These are the **initial values** of the theme system. They are defaults, not
permanent constants. Changing them is expected and supported. The principles in
§3 do not change with them.

### Default palette

| Token | Role | Default | Provenance |
|---|---|---|---|
| `surface-light` | Browsing background | Warm off-white | Reference 1, 2, 3 |
| `ink-light` | Text on light surfaces | Near-black | Reference 1, 2 |
| `accent` | Identity and interactive affordance | Restrained vermilion | Reference 1 |
| `surface-dark` | Project-detail background | Near-black, low chroma | Reference 4 |
| `ink-dark` | Text on dark surfaces | Warm off-white | Reference 4 |

Exact hex values are **reserved for `design-system.md`**. Reference 1 samples at
approximately `#FAF8F5` ground and `#F03C1E` accent, but those figures are taken
from a screenshot rather than a source file and are indicative only.

### Default typography

Serif-first for all public surfaces — display and body. This is the **default
portfolio identity**, not a permanent constraint binding every theme; see §6. No
specific typeface is locked.

### Default page environment

Light for Home, Art Works, About Me and Contact. Dark for project detail
pages. See §10.

### A note on the warm-off-white + serif + warm-accent combination

`SKILL.md` lists this exact combination as its first calibration trait for
generated design, and advises spending free axes elsewhere.

That advice is **overridden here, deliberately**. The combination is not a free
axis being spent on a default — it is the owner's existing visual identity,
evidenced in reference 1, which is tier 2 and outranks the guideline at tier 4.
`SOURCE.md` states that these warnings are "warnings against unintentional
defaults, not categorical prohibitions."

This paragraph exists so the decision is not silently reversed by a future agent
reading `SKILL.md` in isolation. The obligation it creates is real, though: this
palette must be executed with enough specificity — in the accent's exact hue and
restraint, in the typeface choice, in the composition — that it reads as this
filmmaker's identity rather than as a default. Meeting that bar is §16's job.

## 5. Customizable theme model

The portfolio supports an **admin-configurable global theme**. This section
defines the model and its guardrails. It does not implement it.

### Category B — the customizable surface

Exactly these are configurable. Nothing else is.

**Colour — five tokens:**

```text
surface-light     light browsing background
ink-light         foreground/text on light
accent            identity accent
surface-dark      project-detail background
ink-dark          foreground/text on dark
```

**Typography — three roles:**

```text
font-display      headlines, project titles, identity type
font-body         public reading text
font-ui           navigation, controls, small functional labels
```

`font-display` and `font-body` may resolve to the same family. `font-ui` is
independent and may differ from both.

**Selection model — two equally valid paths.**

**Path A — choose a curated typography preset.** Presets are convenience and
quality-controlled starting points: combinations vetted against §3 and known to
work. This is the fast, safe route.

**Path B — compose a custom combination.** Assign `font-display`, `font-body`
and `font-ui` independently from the **supported font library**.

Path B is fully supported, not a fallback or an escape hatch. **Presets are
starting points, not the only permitted combinations.**

In both paths the supported library is the boundary. **Arbitrary external font
URLs and arbitrary uploaded font injection remain out of V1 scope.**

### What is explicitly NOT customizable

- Layout, composition, grid behaviour, block arrangement
- The spacing and type scale (ratios, not absolute faces)
- Motion behaviour and timing
- Media treatment and aspect-ratio handling
- The light-browse / dark-project page model
- Any principle in §3
- **Arbitrary custom CSS — out of V1 scope**
- **Arbitrary external font URL injection — out of V1 scope**
- **Arbitrary uploaded font injection — out of V1 scope**

The last three are firm. They are the mechanisms by which a theme system becomes
an unbounded styling surface, and with them V1 could not guarantee §3 or §14.
Note that they constrain *how* a face is supplied, not *how many* faces the
administrator may combine — composition from the supported library is open
(path B above).

### Derived tokens

The administrator sets five colours. The system derives the rest — muted
foregrounds, hairline rule colour, overlay scrims, focus ring, disabled states —
from those five by rule. Derived tokens are **not** part of the admin surface.
This keeps the configuration small and keeps relationships between values
consistent under every theme.

### Guardrails

Changing theme tokens must not turn the site into a different product. Two
classes of constraint make that guarantee real.

- **Hard invariants — G1, G4, G6, G7.** These hold under every theme
  configuration. A theme that breaks one is rejected.
- **Default direction — G2, G3.** These describe the default identity. A custom
  theme may depart from them, provided the preservation test below is met.

G5 governs how the two selection paths relate.

#### Hard invariants

**G1 — Contrast floor.** Every foreground/background pair must meet WCAG AA.
Configurations that fail are rejected or corrected; they are not accepted with a
warning.

**G4 — Luminance polarity is fixed.** `surface-light` must be light and
`surface-dark` must be dark. Temperature, tint and chroma are open to
customization; polarity is not. Inverting would dissolve the browse/screening
distinction in §10. **Fixed for V1.**

**G6 — Theme changes are global.** One theme for the whole public site. No
per-page, per-project or per-block theming in V1. Per-project theming would make
the site a template engine rather than a portfolio with a point of view.

**G7 — No theme may make the public site read as product UI.** No configuration
of colour or typography may cause the public experience to behave visually like
a SaaS or product interface. A1, A2 and A9 are not negotiable by theme. This is
the outer boundary of all customization.

#### Default direction

These are the default identity, not absolute restrictions.

**G2 — Surfaces are near-neutral by default.** The default identity keeps
`surface-light` and `surface-dark` low-chroma so the photography carries the
colour. A custom theme **may** use more chromatic surfaces if it satisfies the
preservation test.

**G3 — The accent is used sparingly by default.** In the default identity
`accent` marks identity and interactive affordance only — not body text, not
large fills. A custom theme **may** use the accent more broadly if it satisfies
the preservation test.

#### G5 — Presets are starting points, not a closed set

A curated preset is a vetted, quality-controlled combination offered for
convenience. It is **not** the only permitted combination. An administrator may
instead compose a custom combination from the supported font library (§5, path
B), and such a combination is equally valid.

What bounds customization is the **supported library** and the preservation
test — not membership of a preset.

#### The preservation test

A custom theme that departs from the default direction (G2, G3) or from
serif-first typography (§6) is acceptable only if it still preserves **all
five**:

1. **Accessibility** — A10 in full.
2. **Foreground/background contrast** — G1 in full.
3. **Clear hierarchy** — one primary element per view; A3 intact.
4. **Media dominance** — the interface never out-weighs the work; A1 intact.
5. **Editorial / cinematic character** — the tone in §2 survives, and G7 holds.

Failing any one of the five makes the theme invalid. This is a gate, not a
matter of taste.

Which criteria are machine-checkable and which are review judgements — and what
the CMS does with a borderline configuration — is reserved (§16).

## 6. Typography direction

Public typography is **serif-first by default**. A single serif family carrying
both display and body is the reference-supported starting point (references 1, 2
and 4 all do exactly this), and it agrees with `SKILL.md`'s "use one family or
two, and if two, make them clearly distinct."

**No specific typeface is locked.** Selecting one is reserved for exploration
(§16), which must test several deliberate combinations rather than settling on
the first workable serif.

**Serif-first is the default portfolio identity, not an immutable requirement of
every theme.** It is what ships, and it is what the references support. A theme
composed under §5 path B may use a **serif/sans pairing, or another supported
combination**, provided the **editorial hierarchy remains**: display type still
carries personality and weight, body still reads in a measured column, and the
result still satisfies §2 and the preservation test in §5.

What is immutable is **A8** — type as an active compositional element with a
measured reading column — not the serif classification itself.

Direction that is settled:

- **Display type may be treated as image.** Set large, allowed to clip at the
  viewport edge, allowed to be overlapped by media. Reference 1 is the evidence;
  `SKILL.md`'s "use the type treatment itself as an active part of the design"
  is the independent agreement.
- **Body sits in a measured column.** Under ~80 characters, with serif text
  given more leading than a sans would need. Never full-viewport-width.
- **The type scale is a ratio system**, not a set of absolute sizes, so that
  swapping `font-display` or `font-body` does not break hierarchy.
- **All three roles must survive substitution.** Because faces are themeable,
  no composition may depend on the metrics of one specific typeface. Optical
  adjustments belong in the preset, not in the layout.
- **The admin CMS may use its own functional sans-serif**, independent of the
  public theme. The CMS is a tool; it is not bound by §3 beyond ordinary
  usability, per CLAUDE.md §13.

**All-caps** is permitted where the references evidence it — page and project
titles, identity marks (references 1, 2, 4 all use it deliberately). It is
**not** a default wrapper for every small label; `SKILL.md`'s warning applies to
the reflexive tracked-out eyebrow above every heading, and that warning stands.
The line between the two is reserved for exploration.

## 7. Colour direction

**The photography supplies the colour. The interface supplies the quiet.**

References 2, 3 and 4 contain no brand colour at all — every hue on screen comes
from the work. Reference 1 introduces a single accent and uses it three times.
That ratio is the direction.

The bullets below describe the **default identity** — guardrails G2 and G3 in
§5. A custom theme may depart from them subject to the preservation test. The
rules that hold under *every* theme are G1 (contrast), G4 (polarity) and G7
(never reads as product UI), plus A10.

- **By default the interface palette is near-monochrome**: a warm neutral
  surface, a near-black ink, and one accent.
- **The accent is an identity signal, not a UI system.** By default it marks the
  wordmark, the name, and interactive affordance — no accent-tinted component
  family, no secondary or tertiary accent, no semantic colour ramp on public
  pages.
- **By default dark surfaces are near-black and low-chroma**, not navy, not
  charcoal-blue. The project environment should read as an absence of light,
  letting the graded footage be the only source of colour.
- **No gradients as decoration.** No gradient washes, no tinted overlays used
  for style. Scrims over media for legibility are functional and permitted.
- Colour is never the sole carrier of meaning (A10).

Exact values, the derivation rules for muted and rule colours, and the
contrast-validation method are reserved for `design-system.md`.

## 8. Layout philosophy

**Composition over containment.** The page is composed, not filled.

- **Full-bleed is the default for media.** Media runs to the viewport edge.
  There is no global content container that media must sit inside.
- **Text is contained; media is not.** Reading text lives in a measured column
  that may sit anywhere in the field — it does not need to be centred, and
  references 1, 2 and 4 all place it off-centre.
- **Asymmetry is available, not compulsory (A4).** Deliberate offset, overlap
  and clipping are encouraged where they create hierarchy. Reference 1 overlaps
  type with image; reference 2 intersects two hairline frames and lets content
  break out of them; reference 4 offsets two videos so they refuse to align.
- **Negative space is load-bearing (A5).** References 1, 2 and 4 each leave
  roughly a third to a half of the field empty.
- **Hairline rules are an admitted structural device** (reference 2), used to
  group and to frame — including frames that content deliberately escapes. They
  are not a broadsheet grid, and `SKILL.md`'s warning about dense newspaper
  columns does not describe this usage.
- **Rows need not column-align.** Reference 3's three gallery rows have
  different heights and no shared column rhythm. Regularity is not a goal.

### GALLERY vs GRID

Block ownership is locked. Both are existing block types under CLAUDE.md §13;
neither is new.

**GALLERY owns** — native-aspect media presentation:

- justified mixed-aspect rows (reference 3; the brief's "Pixieset" cue)
- horizontal media strips (reference 5, layout only)
- slideshows
- any presentation where media keeps its own proportions and the container adapts

**GRID owns** — intentionally composed columns:

- deliberate column compositions
- **asymmetric editorial presets**, per ADR-0004

ADR-0004 stands unchanged: asymmetric layouts are `GRID` configuration presets,
not a new block type. The canonical block list remains `HERO, TEXT, IMAGE,
VIDEO, GRID, GALLERY, SPACER`. The **enumerated preset list is still reserved**
(§16) — ADR-0004 deferred it to this specification, and this specification
defers it to exploration, because it needs to be drawn and tested rather than
listed.

**Reference 5 contributes layout and interaction only.** Admitted: the
full-bleed horizontal strip of equal-size portrait cards, clipped at both
viewport edges so partial cards signal more content; even gutters; the strip
placed below a text block with generous space above. Excluded: its cream ground,
rounded display sans, pill CTA, informal copy, and floating circular button.

## 9. Media treatment

Media is the subject (A1), presented natively (A6).

- **No card chrome.** No container, no border, no shadow, no elevation, no
  padded frame, no hover lift. References 2, 3 and 4 show media sitting directly
  on the ground. This is also the brief's "not a SaaS product" and `SKILL.md`'s
  anti-SaaS-card passage — three tiers agreeing.
- **Aspect ratios are preserved.** Compositions adapt to the media; media is not
  cropped to fit a uniform tile. A deliberate crop is an editorial act made in
  the CMS, not an automatic consequence of layout.
- **Rounded corners are minimal or absent**, and never applied uniformly to
  everything as a style. Reference 2's collage uses a soft radius; references 3
  and 4 use none. Radius is a compositional choice per context, not a global
  default.
- **Grain, darkness and low-key grading are part of the work.** The interface
  must not brighten, flatten or overlay media to make it more uniform.
- **Covers are editorial.** A project's cover frame is chosen, not derived from
  the first block.

### Video

Behaviour is locked by context:

| Context | Behaviour |
|---|---|
| Home hero | Autoplay, **muted**, loop |
| Main project films | **Click-to-play**, normal audio, visible controls |
| Preview / background video | Autoplay muted, where appropriate |

Sound is never initiated without a deliberate act by the visitor. A project film
is a screening, so it gets real controls and a real transport — reference 4 shows
a visible transport bar and a plain circular play affordance. Autoplay surfaces
are ambient and always silent.

Every autoplaying surface must respect `prefers-reduced-motion` (A10) and must
degrade to a still frame.

## 10. Light / dark page philosophy

This is the site's signature structural move.

| Surface | Environment |
|---|---|
| Home | Light |
| Art Works | Light |
| About Me | Light |
| Contact | Light |
| **Project detail** | **Dark** |

- **Browsing is paper; a project is a cinema.** The light surfaces are the
  editorial connective tissue. Entering a project darkens the room.
- **There is no visitor-controlled light/dark toggle in V1.** The environment is
  a property of the page, not a user preference. This is not an accessibility
  regression — both environments meet the contrast floor (A10, G1).
- **The administrator customizes both palettes** — `surface-light` / `ink-light`
  and `surface-dark` / `ink-dark` — but cannot invert their polarity (G4) or
  reassign which pages use which.
- **The transition itself is a candidate for the site's one signature motion
  moment** (§11). Whether it is treated as a transition or a hard cut is
  reserved.
- Private-project interstitials inherit the environment of the project they
  guard — see §12.

## 11. Motion philosophy

**One orchestrated moment beats scattered effects.**

- **One signature transition or reveal**, used consistently, owns the site's
  sense of motion. The light-to-dark project entry is the leading candidate.
- **Interaction-driven motion is welcome** — motion that answers an action and
  shows what changed: opening, expanding, confirming, revealing.
- **Media-focused transitions** are the preferred register: transitions that
  move, reveal or hand off media, consistent with a site about moving images.
- **`prefers-reduced-motion` is honoured** (A10). Non-essential motion is
  removed, not merely shortened, and no information is conveyed by motion alone.

Explicitly rejected:

- Fade-and-slide-up entrances on every section as content scrolls into view
- Hover transitions on every tile
- Parallax as decoration
- Scroll-hijacking
- Looping ambient animation on interface elements

These are named in §14 as well. `SKILL.md` identifies them as the generic
default, the references show none of them, and they contradict A2 and A3.

## 12. Navigation philosophy

Navigation is **a line of type, not an application shell**.

- Minimal and editorial. Few destinations, plainly named: the brief's four pages.
- It recedes. It is not a persistent competing element, and it never takes
  visual precedence over media (A1).
- Plain language, active voice. A control names what it does.
- Keyboard-reachable with visible focus (A10).

Explicitly rejected:

- Floating pill navigation
- Glassmorphism, frosted panels, blurred translucent bars
- Persistent sticky headers with dense chrome
- Mega-menus, breadcrumbs, utility bars
- A '→' appended to every link label

None of the five references contains any site chrome at all, so the **form** of
navigation — position, persistence, whether it differs between light and dark
environments — is reserved (§16). What is settled is its restraint.

### Private project access

A password gate is an **editorial interstitial, not a login screen**.

Per ADR-0003 a private project is reachable only by direct URL; there is no
listing entry. The gate should read as a title card — the project's own
environment, a single field, a plain instruction. It must not present as account
authentication: no "Sign in", no username field, no "Forgot password", no
account framing. There is no account. Error copy explains what to do next
without apologising or being vague.

## 13. Mobile philosophy

**Preserve hierarchy and identity; do not reproduce desktop overlap literally.**

- **Identity survives; execution adapts.** The oversized display gesture, the
  media-first ratio and the light/dark model all persist. The specific overlap
  geometry does not.
- **Reduce overlap and asymmetry where they harm readability or usability.**
  Deliberate misalignment that reads as composition at 1600px reads as breakage
  at 375px. Asymmetry is available at every size (A4) but is not owed to any
  size.
- **Media stays dominant and full-bleed.** Mobile is the strongest case for
  full-bleed media, not a reason to inset it into cards.
- **Reading measure is the constraint that does not bend.** Text stays readable
  before anything else is preserved.
- **Touch targets and focus states meet the floor** (A10).
- Mobile is a design pass, not a fallback. All five references are desktop
  captures, so mobile has **no reference evidence at all** — it must be composed,
  not derived (§16).

## 14. Explicit anti-patterns

Any of these in public UI is a defect. They are not matters of taste here.

### Product-UI tells

- Content chopped into identical rounded cards
- One border-radius applied to everything regardless of hierarchy
- Soft grey drop shadows under every element (`rgba(0,0,0,.1)`)
- Elevation systems, glassmorphism, frosted or translucent panels
- Gradient washes used as decoration
- Floating pill navigation and SaaS-style sticky chrome
- Badge/pill/chip components used as ornament
- Dashboard framing, stat tiles, KPI rows, feature-grid marketing sections

### Generated-design tells

- Fade-and-slide-up entrances on every section
- Hover transitions on every card
- Tracked-out all-caps eyebrow labels above every heading
- Meta strings joined with middle dots (`A · B · C`) — note the schema's
  `year`, `category`, `client` and `credits` invite exactly this
- `WORD — fragment` constructions with a spaced em dash
- A monospace face used for small data labels
- `→` appended to link and button text
- Numbered markers (`01 / 02 / 03`) on content that is not a sequence
- Accenting a single word in a headline with colour or italic
- Tinted near-blacks (`#0B0B0B`, `#111`) standing in for a considered dark

### Violations of this direction

- Media cropped to a uniform aspect ratio to regularise a grid
- Inverting light/dark polarity (G4)
- Per-page or per-project theming (G6)
- A theme configuration that makes the public site read as product UI (G7)
- Arbitrary custom CSS, external font URLs, or uploaded font injection (§5)
- A visitor-facing light/dark toggle (§10)
- Autoplaying audio (§9)
- A private-project gate presented as account login (§12)

**Two entries are deliberately absent from this list.** Accent used as a large
fill or for body text (G3), and chromatic background surfaces (G2), are
departures from the **default identity** rather than absolute violations. In the
default theme they are defects. In a custom theme they are permitted if — and
only if — the preservation test in §5 is satisfied.

## 15. Reference-to-rule traceability

Every rule above traces to a source. Tier is per CLAUDE.md §21: **2** =
user-provided visual reference, **3** = human product intent, **4** = external
guideline (advisory).

| Rule | Source | Tier |
|---|---|---|
| Media-first, media dominant (A1) | description.md "media should be the dominant visual element"; refs 3, 4 | 3, 2 |
| Not a SaaS product / CMS dashboard (A9, §14) | description.md, stated twice; refs 2, 3, 4 show no card chrome; SKILL.md anti-SaaS-card | 3, 2, 4 |
| Serif display + body, one family (§6) | Refs 1, 2, 4 all-serif; SKILL.md "one family or two" | 2, 4 |
| Display type as image, clipped and overlapped (§6) | Ref 1 oversized clipped `PORTFOLIO`; SKILL.md "type treatment as an active part of the design" | 2, 4 |
| Measured column, <80ch, serif leading (§6, A8) | Refs 1, 2, 4 narrow columns; SKILL.md line-length guidance | 2, 4 |
| Near-monochrome, photography supplies colour (§7) | Refs 2, 3, 4 have zero brand colour | 2 |
| Single restrained accent (§7, G3) | Ref 1 uses vermilion exactly three times | 2 |
| Full-bleed media (§8, §9) | Refs 3, 4 edge-to-edge; ref 5 strip | 2 |
| Deliberate asymmetry and overlap (A4, §8) | Ref 1 type/image overlap; ref 2 intersecting frames with break-out; ref 4 offset videos | 2 |
| Strong negative space (A5) | Refs 1, 2, 4 leave 30–50% empty | 2 |
| Native aspect ratios preserved (A6, §9) | Refs 2, 3; description.md "Pixieset" | 2, 3 |
| No card chrome (A2, §9) | Refs 2, 3, 4; SKILL.md | 2, 4 |
| Hairline rules as structural device (§8) | Ref 2's intersecting outlined frames | 2 |
| Justified mixed-aspect rows → GALLERY (§8) | Ref 3; description.md "Pixieset" | 2, 3 |
| Horizontal clipped card strip → GALLERY (§8) | Ref 5, layout/interaction only (architect Q2) | 2 |
| Asymmetric presets → GRID, not a block type (§8) | Ref 4 composition; ref 2 collage; ADR-0004 | 2, ADR |
| Light browse / dark project (§10) | Refs 1, 2, 3 light; ref 4 dark | 2 |
| Video transport + click-to-play (§9) | Ref 4 shows transport bar and play affordance | 2 |
| One bold move, restraint elsewhere (A3, §1) | Ref 1 wordmark; ref 4 video; SKILL.md "spend your boldness in one place" | 2, 4 |
| One signature motion moment (§11) | SKILL.md; refs show no scattered motion | 4, 2 |
| Flexible project pages, not one template (§8) | description.md "flexible enough to tell different visual stories" | 3 |
| All-caps permitted where evidenced (§6) | Refs 1, 2, 4 use caps deliberately; SKILL.md warns against reflexive use | 2, 4 |
| Warm-white + serif + warm accent, despite SKILL.md trait #1 (§4) | Ref 1 is the owner's identity; tier 2 overrides tier 4 | 2 |
| Writing: active voice, CTA names outcome, errors explain (§12) | SKILL.md writing guidance; uncontested by refs | 4 |

Rules with **no reference support**, established by this document or by the
architect: the theme customization model (§5), the video behaviour matrix (§9),
the absence of a visitor light/dark toggle (§10), navigation restraint (§12),
the private-project interstitial (§12), and mobile philosophy (§13). All five
references are desktop captures containing no site chrome, so navigation,
mobile, Home and Contact have no visual evidence whatsoever.

## 16. Decisions reserved for Claude Design exploration

Open by intent. Exploration must **compose and test** these, not infer them.

### Typography

1. **The typefaces themselves.** Explicitly not locked. Test several deliberate
   combinations. `SKILL.md` warns against reaching for a default family, and the
   references show a conventional high-contrast serif that Q3 says must not be
   reproduced literally — so the answer is neither "the reference serif" nor
   "the first workable serif."
2. **One family or two.** If two, they must be clearly distinct.
3. **The supported font library** — which families it contains, how a family
   qualifies for inclusion, and how each is licensed and self-hosted. Because
   path B (§5) is fully supported, the library is the real boundary of
   typography customization, so its contents matter more than the preset list.
4. **The initial curated preset set** — how many, and what each one is for.
   Presets are starting points (G5), so this set need not be exhaustive.
5. **The `font-ui` role.** Whether navigation shares the serif or takes a
   distinct face on public pages.
6. **The caps boundary** (§6) — where deliberate all-caps ends and reflexive
   label-casing begins.
7. **The type scale ratio**, and how it holds under face substitution —
   including across a serif/sans pairing, not only serif-to-serif.

### Colour

8. **Exact default hex values** for all five tokens.
9. **The accent's precise hue and saturation** — the difference between an
   identity and a generated-design tell lives here (§4).
10. **Derivation rules** for muted foregrounds, hairline rules, scrims and focus
    rings from the five admin-set colours.
11. **Contrast validation method** — how G1 is enforced against admin input.
12. **How the preservation test (§5) is evaluated.** Which of its five criteria
    are machine-checkable (accessibility, contrast) and which are review
    judgements (hierarchy, media dominance, editorial character); what the CMS
    shows for a borderline custom theme; and whether a departure from G2 or G3
    is blocked, warned, or simply recorded.

### Layout and composition

13. **The `GRID` asymmetric preset list.** Deferred by ADR-0004 to this
    document, and deferred again here because it must be drawn and tested.
    Each preset needs a name, a composition, and responsive behaviour.
14. **Home.** No reference exists. Composition entirely open, within §3.
15. **Contact.** No reference exists. Static per architect decision Q10.
16. **Where the reference-5 horizontal strip is used** — featured work on Home,
    related projects on a project page, or a `GALLERY` presentation mode.
17. **Art Works index environment.** §10 locks it light; the exact treatment of
    the light-to-dark handoff on entering a project is open.

### Navigation and chrome

18. **Navigation form** — position, persistence, and whether it differs between
    light and dark environments. No reference contains any site chrome.
19. **Footer** — whether one exists, and what it carries.
20. **The private-project interstitial composition** (§12).

### Motion

21. **The signature moment** — which transition earns it, and its exact
    behaviour. Light-to-dark project entry is the leading candidate, not a
    decision.
22. **Reduced-motion fallbacks** for each motion that ships.

### Responsive

23. **Mobile composition for every page.** No reference evidence exists.
24. **Breakpoint strategy**, and at which widths overlap and asymmetry reduce
    (§13).

### Media

25. **Gallery row-height and gutter behaviour** for justified rows.
26. **Video poster-frame treatment** and the loading state for autoplay surfaces.
27. **Cover-frame selection guidance** for the CMS.

---

## Change control

This document is **Draft — Pending Design Exploration**. It is not yet tier 1
and does not yet carry approved-specification authority.

It becomes tier 1 only on explicit architect approval, after Claude Design
exploration concludes. From that point, changing it requires architect approval
under CLAUDE.md §20.

It does **not** authorise implementation. `design-system.md` and
`page-specifications.md` must follow.

### Theme system — engineering work identified, not yet decomposed

Theme customization has identified future engineering work involving
**persistence, API/delivery, validation, font loading, caching and CMS
controls**.

The **exact ADR decomposition will be decided when theme-system engineering
begins.** No theme ADRs exist yet, none are numbered or reserved, and none are
to be written as part of this document.

The only ADRs this document relies on are **ADR-0003** (private projects
excluded from the public listing) and **ADR-0004** (asymmetric layouts as `GRID`
configuration), both already approved.
