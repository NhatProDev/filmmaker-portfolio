## 0. Locked responsive findings

Accepted by the Project Owner on 2026-09-22 and locked **for the prototype
record**. This is **evidence for the existing candidate, not a new design
direction** — `Private Gate 5B v2` remains the desktop candidate, unchanged.
No design document, spec or ADR is touched.

**Coverage**

1. **768 / 430 / 390 / 375** widths were exercised.
2. **Normal and keyboard-constrained heights** were exercised.

**Derived behaviour**

3. **The desktop vertical-centring strategy fails at extreme constrained
   height.**
4. Below approximately **620px available height**, the Gate derives to a
   **top-aligned constrained flow**.
5. Below approximately **430px width**, the Gate uses the **squeezed responsive
   tier**.
6. **Desktop navigation may be hidden** in the Gate at that narrow tier.
7. **Back to works remains available** at every width and state.

**Measures**

8. Password field: **`min(max(240px, 22ch), 100%)`**.
9. Heading: **`clamp(26px, 8.2cqw, 46px)`**.

**States**

10. INVALID and RATE LIMITED messages **may wrap**, but **must not push *Enter*
    below the usable viewport** in the validated cases.
11. **`aria-invalid` remains `true` only for INVALID**, `false` for RATE
    LIMITED.
12. **Reduced motion keeps the handoff immediate and non-load-bearing.**
13. **No new visual direction, card, modal, sticky action, account UI or
    authentication state was introduced.**

### Page-specific for now — do NOT promote to global rules

- Gate nav hidden at ≤430
- Gate heading clamp values
- Gate field sizing values

These are recorded as this page's answers, on this page's evidence.

### Cross-cutting evidence only — not decisions

- Constrained-height interactive surfaces may need **top-aligned flow rather
  than vertical centring**.
- Display typography should likely use **bounded, composition-relative
  clamping**.

**The site-wide mobile navigation system is explicitly not resolved here.**

### Preserved limitation

Simulated short visual height is **useful evidence**. It does **not** replace
later real **iOS Safari `visualViewport` / software-keyboard testing**, which
remains outstanding.

---

# Private gate — responsive validation of 5B v2

- **Date:** 2026-09-22
- **Status:** Responsive validation of an accepted desktop candidate. **Not approved. No design document, spec, ADR, API contract or schema updated.**
- **Prototype:** `Private Gate 5B Responsive.dc.html`
- **Desktop candidate, unmodified:** `Private Gate 5B v2.dc.html` / `private-gate-5b-v2.md`
- **Exploration record, unmodified:** `Private Gate Directions.dc.html` (5A, 5B v1)

No 5C. No redesign. Every derivation below is computed from each frame's own
width and height — nothing is authored per device, and none of it changes the
page's meaning, hierarchy or order.

Six viewports are rendered simultaneously, each running the full state machine:
768 × 1024, 430 × 932, **430 × 596 (keyboard)**, 390 × 844, **390 × 400
(keyboard)**, **375 × 307 (keyboard, worst case)**. A keyboard frame is short
because the keyboard has taken the rest — what the frame shows is what the
visitor can reach without scrolling.

## 1. Failures found in the desktop candidate

**One hard failure, and it is the one §8 of the desktop review predicted.**

At **375 × 307 with the invalid message shown**, *Enter* finished **20px below
the fold** and the content began to scroll. The submit control for a
single-field page was off screen at the exact moment the visitor most needs it
— immediately after a failed attempt, with the keyboard still open.

Two further problems, both real if less acute:

- **Vertical centring is wrong at constrained heights.** Centring a growing
  form inside a shrinking box pushes the bottom of the form off screen as soon
  as a message appears. It is the mechanism of the failure above, not a
  by-product.
- **`22ch` alone is too narrow a field.** At the responsive type size the
  measure resolved to **199px** — under a third of a 768 viewport and cramped
  for typing a password with the characters hidden.

Not failures, confirmed working unchanged: the 46px heading is fine at 768; the
`readOnly`-not-`disabled` submit behaviour holds; disclosure holds at every
width (still zero media elements, still no project object).

## 2. Responsive derivations introduced

| Derivation | Rule | Why |
|---|---|---|
| **Vertical alignment** | centred above 620px height, **top-aligned below** | the form must grow downward into space, not off the edge |
| **Constrained tier** | `height < 620` — reduced gaps, statement drops below 380 | recover vertical room before anything is removed |
| **Squeezed tier** | `height < 430` — heading 21px, gaps to 10–12px, footnote hidden | the last reserve, for a small phone with the keyboard up |
| **Field measure** | `min(max(240px, 22ch), 100%)` | a floor for typing, a ceiling that keeps it from reading as a search bar |
| **Heading** | `clamp(26px, 8.2cqw of the spine, 46px)`, −4px when constrained, 21px when squeezed | bounded, container-relative, never larger than desktop |
| **Edge padding** | 56 → 32 (≤768) → 24 (≤430) | |
| **Navigation** | full nav hidden at ≤430 | |

Nothing was added. No card, no modal, no sticky bar, no account UI, no new
state, no copy shortened to hide a layout problem.

## 3. Behaviour at each width — clearance of *Enter* above the fold

| Viewport | Idle | Invalid | Rate limited |
|---|---|---|---|
| 768 × 1024 | 679px | 612px | 633px |
| 430 × 932 | 577px | 510px | 532px |
| 430 × 596 (kb) | 268px | 201px | 223px |
| 390 × 844 | 496px | 429px | 450px |
| 390 × 400 (kb) | 128px | **61px** | 83px |
| 375 × 307 (kb) | 96px | **29px** | 51px |

**No frame scrolls in any state.** *Back to works* sits 3–4px below *Enter* in
every case, so the escape route is reachable wherever the action is.

## 4. Keyboard-open behaviour

Top alignment is the whole answer. With the keyboard up the page reads:
eyebrow → heading → field → message → actions, all above the fold, with the
statement and footnote dropped rather than the hierarchy reordered.

**One threshold was moved on evidence.** The squeezed tier was first set at
`height < 360`, which left **390 × 400 with 11px of clearance** in the invalid
state — technically reachable, effectively on the edge, and worse than the
shorter 375 frame that did qualify. The tier now starts at **430**: the
boundary has to sit above the tallest failing case, not at the shortest device.
That moved 390 × 400 from 11px to 61px.

## 5. Form-width rule

```text
width: min(max(240px, 22ch), 100%)
```

240px floor for practical entry, 22ch preferred measure, never wider than the
container. Resolved at **240px in all six frames** — 65% of the usable measure
at 375, 37% at 768. Desktop keeps its 270px, which the same expression
produces at desktop type size.

## 6. Heading rule

`clamp(26px, 8.2cqw of the spine, 46px)`, less 4px when constrained, 21px when
squeezed. Measured: **46 / 31 / 27 / 28 / 21 / 21px**.

The desktop 46px is preserved as the ceiling, so this is a bounded derivation
rather than a new type decision — but see §10.

## 7. Navigation

Full public nav at 768, hidden at ≤430. The gate has one job, and three links
competing with the only control on the page is noise on a 375px screen. The
wordmark stays, and **the escape route is never removed** — *Back to works*
lives in the form beside *Enter*, where it is always reachable.

No hamburger, no menu, no account navigation.

## 8. Invalid / rate limited at narrow widths

Both wrap inside a 40ch measure, two lines at 375. Neither collides with
*Enter*: the actions row follows the message in flow and both stay above the
fold (§3). Copy was not shortened.

The rate-limit message stays visually *quieter* than the form: same 14px, same
rule, no icon, no colour beyond the accent already used for the field rule —
it never outweighs the field it is about.

Semantics remain distinct at every width: **`aria-invalid="true"` on invalid,
`"false"` on rate limited** — the password was not judged wrong; the request
was not judged at all. Both are announced via `role="alert"` and referenced by
`aria-describedby`.

## 9. Reduced motion

`prefers-reduced-motion` (or the review switch) sets the handoff transition to
**`0s` in all six frames**, verified. The state is carried by the veil and
content opacity, not by the animation, so the handoff is instantaneous and
reads identically. Handoff itself verified at every width: veil 1, content 0,
no metadata.

## 10. Cross-cutting, not gate-specific

Three of these belong to the candidate set, not to this page:

1. **Constrained-height behaviour is not a gate problem.** Any page whose
   primary control sits below a growing element has it. A general rule —
   *content that must remain actionable is top-aligned below ~620px of
   viewport height* — would serve Contact's form-free page and any future
   input surface equally.
2. **Display coefficients.** This page now sizes its heading against the spine
   with a clamp, which is the third different approach in the set (Home's
   `13.3cqw` of a grid container, Contact's `cqw` of the spine, this clamp).
   `home-baseline-v2.md` §8.4 already records the underlying problem. **One
   convention should be chosen for all pages**, and this validation is evidence
   for the clamped, spine-relative form.
3. **Nav at mobile is unresolved site-wide.** Hiding it is right for the gate
   because the gate has one job; Home, Art Works, About and Contact all need
   an answer, and it should not be inherited from this page.

Gate-specific and staying here: the squeezed tier, the field floor, and the
statement/footnote drop order.

## 11. Readiness

**The gate is ready for responsive candidate status.** The failure the desktop
review predicted was reproduced, measured, and fixed by derivation rather than
redesign; *Enter* and the escape route are reachable in every state at every
tested viewport with no scrolling; disclosure, semantics and reduced-motion
behaviour hold throughout.

Two things remain open, and neither is this page's to settle: the three
cross-cutting items in §10, and validation on real devices — a simulated short
viewport is a good proxy for the keyboard but not a substitute for iOS Safari's
actual visual-viewport behaviour.
