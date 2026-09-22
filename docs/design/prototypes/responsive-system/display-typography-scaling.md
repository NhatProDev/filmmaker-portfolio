## 0. Locked findings

Accepted by the Project Owner on 2026-09-22.

**Status: SHARED RESPONSIVE CANDIDATE — SYSTEM VALIDATED.**
**Not** design approved · **not** production-ready · **not** page-validated.

No design document, spec, ADR or page candidate is modified by this record.

**Reference box**

1. Display typography **scales against the composition / alignment container**.
2. **Viewport-relative scaling is rejected** as the default method.
3. **Page-wide container scaling is also inappropriate** when the type aligns
   to a narrower internal composition.

**Method**

4. Use **bounded composition-relative scaling**:

```text
clamp(
  preset-scoped minimum,
  preset-scoped coefficient × 100cqw,
  composition-scoped maximum
)
```

5. **This is a METHOD, not one global set of values.**

**Font / preset sensitivity**

6. **Glyph advance varies materially by face** (6–15% across the tested set).
7. **Coefficients belong to the typography preset / face.**
8. **A coefficient tuned for one face must not silently be reused after a face
   swap.**

**Content length**

9. The coefficient **must not adapt to title or string length**.
10. **Long content wraps** instead of shrinking to fit.
11. **JS shrink-to-fit is rejected** — it makes font size encode content length
    rather than hierarchy.

**Bounds**

12. The **maximum is evidence-backed and load-bearing**.
13. The **minimum did not engage** in the tested range.
14. The minimum therefore remains a **precautionary preset guard**, not a
    validated universal threshold.

**Production**

15. **No JavaScript measurement is required.**
16. **CSS container query units + `clamp()` are sufficient.**
17. **The container context belongs on the box the typography aligns to.**

### Kept open

- Exact preset coefficients are not derived here.
- Minimum values remain unvalidated.
- Wrapped display line-height is unresolved.
- Maximum line-count policy is unresolved.
- Tests used uppercase, fixed-tracking material.
- **Project Detail long-title behaviour still needs page-level responsive
  validation.**

---

# Display typography — responsive scaling method

- **Date:** 2026-09-22
- **Status:** System validation. **Nothing approved. No page candidate, design document, spec or ADR modified.**
- **Prototype:** `Display Typography Scaling.dc.html` (this directory)

A measurement instrument: 4 strategies × 4 representative compositions ×
3 faces × 5 strings × 7 widths. Every figure is taken from **measured glyph
advances** for the real loaded face, not from coefficient arithmetic.

The goal is one predictable sizing **method**, not identical sizes.

## 1. Strategies tested

| | Definition |
|---|---|
| **viewport** | `coef × viewport width` |
| **composition** | `coef × the width of the box the type must align to` |
| **clamped** | `clamp(min, coef × composition width, max)` |
| **fit (JS)** | size solved from the measured string so it exactly fills its box |

Both coefficients are tuned **once**, honestly and identically: to Marcellus,
`MADE TO MEASURE`, filling the Home composition at 1440. Everything else in the
tables is that single tuning meeting other conditions.

## 2. Raw viewport/page-relative scaling fails

| Composition | 1440 | 1024 | 768 | 375 |
|---|---|---|---|---|
| Home (12 col) | 100% | **103% ✗** | **101% ✗** | **106% ✗** |
| Project title (8 col) | **151% ✗** | **157% ✗** | **153% ✗** | **106% ✗** |
| Spine (6 col) | **203% ✗** | **212% ✗** | **207% ✗** | **106% ✗** |

Two distinct failures:

1. **It cannot know the box.** Type sized against the viewport overflows a
   narrower composition by 51–112%. Obvious in hindsight, brutal in practice.
2. **It fails even on the composition it was tuned for.** Home overflows by
   3–6% at every width except 1440, because the page's **edge padding is a
   fixed pixel value** — so the composition is *not* a constant fraction of the
   viewport. A viewport coefficient is therefore correct at exactly one width.

This is the mechanism behind `home-baseline-v2.md` §8.4's clipping, stated
precisely.

## 3. Composition-relative: utilisation is invariant with width

| Composition | 1440 | 1024 | 768 | 600 | 430 | 390 | 375 |
|---|---|---|---|---|---|---|---|
| Home | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| Project title | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| Spine | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| Gate | 100% | 100% | 100% | 100% | 100% | 100% | 100% |

**This is the decisive result.** Sizing against the box the type must align to
holds the type's relationship to the layout constant at every width and in
every composition, with one coefficient. Nothing else tested does that.

## 4. Bounds

| Bound | Engaged? | Evidence |
|---|---|---|
| **max 120px** | **Yes, load-bearing** | Home at 1440 wants 142px; clamped to 120px (84% utilisation) |
| **min 26px** | **Never engaged** | smallest size across the whole matrix was 35px at 375 |

So the maximum is doing real work — without it a 12-column display at 1440+
keeps growing past what the page can carry. **The minimum is untested**: it is
precautionary, and nothing in this range validates a particular value. It
should be carried as a guard, not presented as evidence-backed.

## 5. Font-metric sensitivity

Measured advance per 1px of size:

| String | Marcellus | Spectral | Archivo | Spread |
|---|---|---|---|---|
| short | 4.721 | 5.027 | 4.768 | 6% |
| medium | 7.915 | 8.952 | 9.117 | **15%** |
| title | 9.316 | 9.939 | 9.738 | 7% |
| long | 20.796 | 23.191 | 22.842 | 12% |
| mixed | 7.936 | 8.106 | 7.221 | 11% |

At a Marcellus-tuned 100% fill, Spectral renders the same string at **107%** —
it overflows. **The method is face-independent; the coefficient is not.**

This does not need hiding: the coefficient belongs to the typographic preset,
exactly as tracking already does. One method, one coefficient per preset.

## 6. Long titles

At one coefficient, in the same box, the same face:

| String | Utilisation | Lines |
|---|---|---|
| short (`CONTACT`) | 51% | 1 |
| medium | 85% | 1 |
| title | 100% | 1 |
| **long (38 chars)** | **223%** | **3** |

Content length dominates every other variable. A coefficient tuned for a
typical title cannot also fit an atypical one — and **it should not try**.
Project titles are not known at design time, so the method must degrade by
wrapping, not by shrinking.

**The `fit (JS)` control demonstrates why shrink-to-fit is wrong**, not just
unnecessary:

| String | clamped | fit (JS) |
|---|---|---|
| short | 94px | 120px |
| title | 94px | 94px |
| long | 94px (wraps) | **42px** |

Shrink-to-fit gives one project a 94px title and the next a 42px title on the
same page template. That is not a responsive rule, it is an inconsistent
typographic system — the size would encode title length rather than hierarchy.

## 7. Wrapping

Wrapping is the correct failure mode and must be permitted. The rule the
evidence supports: **size for the typical case, allow wrap for the atypical
one.** At the tested coefficient a long title wraps to 2–3 lines and remains
legible at full size; forcing one line would either shrink it to 42px or clip.

`design-direction.md` §6 already permits display type clipped at the page edge
as a deliberate gesture — that remains available, but it must be *authored*,
not the accidental result of a coefficient, which is the state `home-baseline-v2.md`
§8.4 recorded.

## 8. Recommended method

```css
font-size: clamp(<preset min>, <preset coefficient> × 100cqw, <preset max>);
```

with the **container query context set on the element the type must align to** —
the grid span, the spine, the form column — not the page and not the viewport.

Stated as an invariant about method:

> Display type is sized as a bounded proportion of **the composition box it
> aligns to**, never of the viewport or the page. The proportion is a property
> of the typographic preset. Length is handled by wrapping, never by shrinking.

## 9. What must remain preset- or page-specific

| Value | Scope | Why |
|---|---|---|
| Coefficient | **Preset** (per display face) | 6–15% metric spread between faces |
| Minimum | **Preset** | a legibility floor, face-dependent |
| Maximum | **Page or composition** | Home's 12-column display and the Gate's form heading have different ceilings for the same reason they have different jobs |
| Reference box | **Composition** | it is the thing being aligned to |

The **method** is shared. None of these four numbers should be global.

Reconciling the existing candidates: Home's `13.3cqw`, Contact's `21.3cqw of
the spine` and the Gate's `clamp(26px, 8.2cqw, 46px)` are **already the same
method with different reference boxes and bounds**. Contact and the Gate use
the box the type aligns to; Home uses a wider container than its own alignment
target, which is why it clips on a face swap. No page needs a new approach —
Home needs its reference box corrected, and that is a page change, not made
here.

## 10. Is JavaScript required?

**No.** `clamp()` and container queries express the method completely; the
`comp` and `clamped` columns are pure CSS. The only strategy needing JS is
`fit`, and §6 shows it produces a worse typographic system. JS measurement
would be a mechanism in search of a defect.

## 11. Remaining uncertainty

1. **The minimum bound is unvalidated** — never engaged in the tested range.
2. **Coefficients per preset are not derived here.** This pass establishes that
   each preset needs its own; picking them is a typographic decision per preset.
3. **Only uppercase strings were tested**, matching current usage. Mixed case
   changes advance and would shift coefficients.
4. **Letter-spacing was held at −0.005em.** Tracking changes the measured
   advance, so preset coefficient and tracking must be tuned together.
5. **Wrapped display type has no line-height or max-line rule yet** — the
   evidence says wrapping is correct, not what a wrapped title should look like.
6. **No page has been changed or re-validated** under this method; Home's
   reference box is the obvious first candidate.

## 12. Readiness

**Yes — strong enough to become the shared display-typography responsive
candidate**, as a *method* invariant with per-preset values:

| Criterion | Result |
|---|---|
| Stable relationship to layout | ✓ 100% utilisation at all 7 widths, all 4 compositions |
| Viewport-relative rejected on evidence | ✓ up to 212% overflow; fails even its own tuned composition |
| Bounds justified | ✓ max load-bearing; min carried as an unvalidated guard |
| Font sensitivity handled, not hidden | ✓ coefficient scoped to preset |
| Long titles usable | ✓ wrap, not shrink |
| No JS required | ✓ pure CSS clamp + container query |
| No universal numeric values imposed | ✓ method shared, values scoped |
