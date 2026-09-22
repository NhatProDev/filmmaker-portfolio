# Private project gate — 5B v2 review

- **Date:** 2026-09-22
- **Status:** Candidate baseline under refinement. **Not approved. No design document, spec or ADR updated.**
- **Prototype:** `Private Gate 5B v2.dc.html`
- **Retained as record:** `Private Gate Directions.dc.html` (5A, 5B v1), `private-gate-directions.md`
- **Authority:** `design-direction.md`, `design-system.md`, `page-specifications.md`, ADR-0003, CLAUDE.md §19

## 0. Locked candidate decisions

Accepted by the Project Owner on 2026-09-22 and locked **for the prototype
record**. This is not design-document approval: `design-direction.md`,
`design-system.md` and `page-specifications.md` remain Draft, and no ADR, API
contract or schema is touched.

**Direction and scope**

1. The Private Project Gate uses **Direction 5B v2 — Editorial Access**.
2. **The gate remains non-disclosive before authorization.**
3. **No project metadata, imagery, media or project-derived presentation is
   exposed.**
4. **The gate is not an account login.**
5. **Private-project access remains separate from admin authentication.**

**Field**

6. **One project password field.**
7. Desktop measure is **approximately 22ch / 270px on the reading spine**.
8. **Show / Hide remains a quiet, accessible control.**
9. **`autocomplete="off"`** — this is not an account credential (§5).
10. **Client-side typing never validates the password.**
11. **Submitting uses `readOnly`, not a disabled field.**

**States**

12. **Six visual states are supported:** IDLE · FOCUSED · SUBMITTING · INVALID ·
    RATE LIMITED · HANDOFF.
13. **Rate-limited feedback is generic** — no counts, no thresholds, no
    indication of password correctness.
14. **Invalid-password feedback is generic.**

**Handoff and motion**

15. Success performs a **restrained light-to-dark handoff**.
16. **`prefers-reduced-motion` removes or nearly removes** the handoff
    animation.

**Open**

17. **Mobile and tablet behaviour remains pending visual validation.**

### Recorded as ENGINEERING / SECURITY questions, not Design decisions

- Unknown-route vs private-route HTTP and routing behaviour
- Enumeration resistance
- Rate-limit thresholds
- Whether `Retry-After` is surfaced
- Project-access cookie scope
- Invalid / rate-limit response timing parity

Design's position on all six is recorded in §9. **None is a Design decision**,
and the visual contract does not depend on any particular answer.

### Exploration evidence, unchanged

5A and 5B v1 remain exactly as explored in `Private Gate Directions.dc.html` /
`private-gate-directions.md`. They are not maintained forward.

---

## 1. Changes from 5B v1

1. **The field moved onto the reading spine.** It was a four-column margin
   element; it now sits under the statement at cols 1–6, at a deliberate
   **22ch / 270px minimum** measure — 35% of the spine. It no longer reads as a
   search bar, and stacking it at mobile no longer makes it full-width by
   default.
2. **A sixth state: rate limited**, with generic wording and no counts.
3. **Reduced motion is honoured** — the handoff fade drops to `0s` and the
   state change is instantaneous.
4. **`autocomplete` changed from `current-password` to `off`** (§5).
5. **The field name changed** from `project-access-password` to
   `project-access`, so nothing in the DOM presents it as an account credential.
6. Error measure capped at 40ch so the message wraps predictably above the
   actions rather than displacing them unpredictably.
7. `autocapitalize`, `autocorrect` and `spellcheck` disabled — a password typed
   on a phone should not be auto-capitalised.

## 2. Disclosure audit

**The prototype contains no project object.** Nothing is fetched, passed in or
derived, so there is no path for project data to reach the render.

| Forbidden before authorization | Present? |
|---|---|
| Title, synopsis, category, project-specific copy | No — every string is route-independent |
| Image, poster, thumbnail, video, frame | **0 `img` / `video` / `svg` / `picture` elements** |
| Client, date, runtime, credits | No |
| Project-derived colour | No — the palette is the site's, fixed |

Both failure messages are identically generic and neither confirms that a
project exists at this route. The review readout re-runs a vocabulary scan over
rendered text on every state change.

## 3. Form hierarchy

```text
— datum rule (shared with About and Contact) —
PRIVATE PROJECT                12px tracked caps, muted
This work is password          46px display
  protected.
explanatory line               17px muted, 44ch
ACCESS PASSWORD                12px tracked caps — persistent label
[ field, 22ch on one hairline ]
                    Show       13px, right-aligned to the field
[ message, 40ch, rule above ]  only in invalid / rate-limited
Enter      Back to works       17px / 16px
access-is-for-this-work-only   13px muted
```

## 4. The six states

| State | Contract | Verified |
|---|---|---|
| **Idle** | Empty field on a hairline, Enter available, no message | `err:none · ro:false · dis:false` |
| **Focused** | 2px ink outline at 6px offset, persistent label remains | `rgb(22,18,14) solid 2px` |
| **Submitting** | Enter reads *Checking…*, disabled, `aria-busy="true"`; field **`readOnly` not `disabled`** so focus is kept; repeat submits ignored at the handler | `ro:true · dis:true · busy:true` |
| **Invalid** | Generic message, accent field rule, `aria-invalid="true"`, `aria-describedby` wired, value preserved, focus returned | `err:block · aria-invalid:true · desc:pw-gate-error` |
| **Rate limited** | *Too many attempts. Please wait and try again.* Same slot, same treatment. **No count, no threshold, no countdown, no existence hint.** `aria-invalid` stays `false` — the password was not judged wrong, the request was not judged at all | `err:block · aria-invalid:false · desc:pw-gate-error` |
| **Handoff** | Content to 0, surface to near-black, field and submit locked. No message, no celebration, no metadata | `veil:1 · content:0 · ro:true` |

The client **never enforces** rate limiting and never counts attempts — the
state is a visual contract for a server response.

Typing after any failure clears the visible message and returns to idle without
re-validating.

**The state switch is reversible**: returning to `live` clears the pending
timer, releases `readOnly` and the disabled submit, and restores idle. Verified
across all six states and back.

## 5. Autocomplete decision

**Decision: `autocomplete="off"`, `name="project-access"`.**

`current-password` is defined by the HTML autofill spec as *the current password
for the account identified by the username field*. This form has no account and
no username field, so the token is a factual misstatement about what is being
collected.

The deciding argument is not semantics but behaviour: **several private projects
share one origin and each has a different password.** A password manager keyed
by origin would treat them as one credential and overwrite it every time a
different project is opened — actively harmful to a client who holds two.

`new-password` was also rejected: it invites generation offers for a password
the visitor was given and cannot choose.

**Residual, flagged for engineering:** Chrome and Safari apply heuristics to
password inputs and may still offer to save regardless of `off`. This is a
preference, not a guarantee, and the design does not depend on it being
honoured — it simply must not *request* credential treatment.

## 6. Accessibility verification

- Real `<form>`, `<input type="password">`, `<button type="submit">`.
- Persistent visible `<label for="pw-gate">` matching the input id — never a
  placeholder standing in for a label.
- Message carries `role="alert"`, referenced by `aria-describedby` in both
  failure states and removed otherwise.
- `aria-invalid` distinguishes the two failures honestly: `true` on invalid,
  `false` on rate limited.
- Focus is a 2px outline at 6px offset on every control, never colour alone.
- `Show` is a real `<button type="button">` with `aria-pressed`, a text label
  that changes to `Hide`, and focus returned to the field.
- Motion is never load-bearing: with reduced motion the handoff transition is
  `0s` and the state is still fully legible.
- Escape route is an ordinary keyboard-reachable link naming *Works*.

## 7. Success handoff

Server verifies → signed HTTPOnly cookie → navigate to protected Project Detail.
The gate contributes only the last 260ms: content out, surface to near-black.
No success message, no metadata, nothing prefetched.

This is the site's established light→dark transition, arriving from a page
rather than from a clicked frame — the same gesture Home and Art Works use into
a project.

## 8. Responsive risks (recorded, not solved)

1. **Software keyboard overlap** is the sharpest. The content is vertically
   centred; with a keyboard open the field, message and *Enter* can all sit
   under it. Vertical centring almost certainly has to be abandoned at
   constrained heights in favour of top-aligned flow.
2. **Field width** is now `22ch / min 270px`, which survives stacking — but
   270px is close to a 375px viewport's usable width and may need revisiting.
3. **Error wrapping** is capped at 40ch; at mobile it becomes two or three
   lines and pushes the actions down while the keyboard is open.
4. **Navigation compression.** Full nav on a page whose job is one field becomes
   a menu at mobile; 5A's single identity line was better here.
5. **Heading scale** is fixed at 46px rather than container-relative, unlike the
   rest of the candidate set.
6. **Show placement** is right-aligned to the field; at narrow widths it may
   want to sit inline with the label instead.

## 9. Security / engineering questions left open

1. **Unknown route vs private route.** The gate deliberately cannot tell the
   visitor whether they found a real private project or an unknown protected
   route. Whether that holds end to end is an **HTTP status and routing policy
   decision** — flagged for engineering and security review, not designed here.
2. **Rate-limit policy.** Threshold, window, per-IP vs per-route, and whether
   `Retry-After` is exposed. If a real countdown is ever provided, the message
   slot can carry it; the design does not assume one.
3. **Cookie scope and lifetime** — per project, presumably; not a design
   decision.
4. **Autofill heuristics** may override `autocomplete="off"` (§5).
5. **Message parity.** Invalid and rate-limited are visually identical by
   design. Engineering should confirm the *timing* of responses does not leak
   what the copy withholds.

## 10. Architecture

**Nothing new was introduced.** No account schema, no reusable login, no reuse
of admin authentication, no client-side password verification, no project
metadata preload, no composer blocks. The page is a static form posting to the
existing project-access verification, consistent with ADR-0003.

Rate limiting is named here only as a **visual state**; it remains an
implementation and security concern.

## 11. Readiness

**5B v2 is strong enough to remain the Private Project Gate candidate
baseline.** The refinement fixed the search-bar field, closed the reduced-motion
gap, added the missing failure state, and corrected a semantic
misrepresentation in the autocomplete token that would have degraded real use
for anyone holding two project passwords.

Outstanding: mobile — particularly the keyboard-overlap case — and the routing
and rate-limit questions in §9, which belong to engineering.
