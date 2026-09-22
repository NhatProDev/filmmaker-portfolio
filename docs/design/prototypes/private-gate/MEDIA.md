# Private Project Gate Prototype Media — Manifest

- **Date:** 2026-09-22
- **Status:** Tracked manifest. **This page has no runtime media dependencies.**

This file exists to record an absence, and that absence is the point.

---

## Zero project-specific media dependencies

**The Private Project Gate candidate depends on no runtime media of any kind.**

| Dependency | Count |
|---|---|
| Images (`img`, `picture`, `source`) | **0** |
| Video / audio (`video`, `audio`) | **0** |
| Vector (`svg`, `canvas`) | **0** |
| Embeds (`iframe`) | **0** |
| CSS `background-image` / `url(...)` | **0** |
| References to `media/` | **0** |

This is not incidental. It is the visual expression of the page's hard
non-disclosure invariant: **before authorization the gate exposes no project
metadata, and imagery is metadata.** A poster, a thumbnail or a project-derived
colour would each disclose that a project exists and hint at what it is.

**The prototype contains no project object.** Nothing is fetched, passed in or
derived, so there is no path by which project data could reach the render.

The prototype enforces this at runtime with a **live vocabulary scan** over
rendered text on every state change, flagging any of *title, client, runtime,
synopsis, credit, year, poster* if it ever appears — plus an element count
asserting zero media nodes.

**Consequently there is nothing to restore in a fresh clone for this page.**
Unlike every other prototype directory, the gate renders completely without
`media/`.

---

## Artifacts in this directory

```text
Private Gate 5B v2.dc.html        candidate baseline prototype
private-gate-5b-v2.md             its review record
Private Gate Directions.dc.html   exploration record — directions 5A / 5B v1
support.js                        prototype runtime support
```

**5B v2 is the selected candidate baseline. It is not approved.** Its own header
says so, and `page-specifications.md` §6 records the Private Project Gate as
VISUALLY EXPLORED — candidate.

`Private Gate Directions.dc.html` is **exploration evidence, retained as
record**. 5A and 5B v1 remain exactly as explored; they are not maintained
forward. Do not treat either direction as current.

`support.js` is byte-identical to the copies in `../home/`, `../art-works/`,
`../project-detail/`, `../about/` and `../contact/`. Each prototype directory
carries its own copy so the files render standalone.

**Cited but not present:** `private-gate-5b-v2.md`'s header lists
`private-gate-directions.md` as retained record. That file is **not in this
directory**. It has not been recreated and must not be fabricated. If it is
recovered, this directory is its canonical location.

---

## No credential is handled by the prototype

Recorded because it is easy to assume otherwise of a page with a password field:

- **Nothing is compared, stored or transmitted.** A review stub decides the
  outcome so the six visual states can be inspected.
- **The client never validates a password**, and never counts attempts or
  enforces rate limiting — both are server concerns.
- The field is `name="project-access"` with `autocomplete="off"`, so nothing in
  the DOM presents it as an account credential. See `page-specifications.md`
  §6.7 for the reasoning.

---

## Open items

None are media. The gate's outstanding items are recorded in
`page-specifications.md` §6.9 and fall into two kinds:

- **Responsive**, chiefly soft-keyboard overlap at constrained heights.
- **Engineering / security** — routing behaviour, enumeration resistance,
  rate-limit policy, `Retry-After`, cookie scope and response-timing parity.
  None of these is a visual-design blocker.

**No visual-design blocker remains** (`page-specifications.md` §6.9).

### Resolved — the theme-environment conflict

This manifest previously listed a third item: a **design conflict** over the
gate's theme environment, "disputed between the specification and the
candidate." **That conflict is closed.** It was resolved by Project Owner
decision on **2026-09-22** in favour of the candidate, and is recorded at
`page-specifications.md` §6.3.

```text
pre-authorization    route-independent · non-project-derived
                     light public editorial candidate surface

authorized handoff   may transition into protected Project Detail
                     the current candidate uses the light → dark handoff
```

The superseded rule was *"the gate inherits the environment of the project it
guards."* It conflicted with the stronger pre-authorization non-disclosure
invariant (§6.5): a protected project's environment is itself project-derived
presentation, and exposing it before access is verified discloses something
about the work being guarded.

This changes nothing about the zero-media finding above — that finding is the
visual expression of the same non-disclosure invariant.
