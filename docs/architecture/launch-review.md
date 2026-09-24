# Phase 3D launch review

Phase 3D was the final core phase: design-review items, polish, hardening
and the launch lock. It starts from `phase-3c-content-system-v1` (`c821b8b`).
The deployment record is in `docs/operations/deployment.md` §10.

The classification used below:

- **A** — safe objective implementation (done);
- **B** — needs the owner's subjective design approval (prepared, not done);
- **C** — better deferred (reason given).

## 1. Deferred design-review items

| Item | Class | Outcome |
|---|---|---|
| Album public design (`/albums`, `/albums/<slug>`) | B | The pages exist (ADR-0019) and are assembled only from the existing system. 3D QA covered three engines and five widths from 1440 to 320: no overflow, one `h1`, labelled landmarks, visible focus, noindex where due. The fixed 404 double header (§3) was the only defect. Approving the design itself is the owner's decision. |
| Albums in public navigation | B | Not linked. Adding a fourth item changes the locked header. Albums stay reachable by direct URL and the sitemap once one is published. |
| Letterbox on `JUSTIFIED_ROWS` (project galleries, albums) | A | Implemented (§2). |
| Letterbox on the opening, presets, Home (hero, wall, frames) | B | Unchanged. Each crops inside a fixed frame, so the result is a new composition that needs a reviewed reference (ADR-0016 Decision 4). The Studio's Picture area hint now names which surfaces apply the area. |
| Video in justified rows | C | Still deferred; see `content-system.md` §8. The poster-fit rule, the playback mode for rows and the play affordance at the smallest tile are design decisions, not engineering ones. `VIDEO_GRID`, `HORIZONTAL_STRIP` and `SLIDESHOW` already carry video. |
| Generic blocks on Home | B | Unchanged (ADR-0018). |
| Pause control for autoplaying loops (WCAG 2.2.2) | B | See §4. |

## 2. Letterbox in justified rows

A row tile already takes its asset's own aspect: packing is computed from
aspect ratios. A letterboxed still (ADR-0016) now packs at its **active
picture's** aspect. The file keeps its own proportions, spans the tile's width
and is centred, so the baked bars fall outside the tile. Nothing is distorted,
and there is no crop geometry beyond the closed enum.

- **Default identical.** A still without an active picture renders exactly
  the markup it rendered before (`tests/justified-rows-picture.test.ts`).
  That covers all 22 production assets today.
- **Deterministic.** The packing and the frame come from two numbers: the
  enum's aspect and the file's aspect.
- **Responsive.** Rows re-pack at every width from the same aspects. The
  image is sized with container units, so it stays exact in any cell.
- **Home is excluded.** Its frames pass `framing="encoded"` until its design
  review.

## 3. Public fixes

Both fixes were verified by screenshot. Every other public route at 1440, 834
and 390 is pixel-identical to the 3C baseline.

| Route | Viewport | Before | After | Bug |
|---|---|---|---|---|
| `/albums` (404 while no album is published) | all | The site header and frame drawn twice | Drawn once | A `notFound()` inside the public layout rendered the root 404, which wraps that layout again |
| `/admin/login` | 390, 320 | The card overflowed by 5px (horizontal scroll) | Fits | Content-box width `min(380px, 100%)` plus padding and border |

The only markup changes are in `<head>`: `og:url` on every page, `og:locale`
kept on project and album pages, and share images for Home (the hero poster)
and About (the portrait). The font class hash changed with §6.

## 4. Accessibility (WCAG 2.2 AA-oriented)

**Fixed:**

- Studio panels no longer remount and wipe typed edits when another panel
  saves.
- Unsaved edits and running uploads warn before the page is left.
- Accessible names: Featured, the project password, media search, credits,
  placement and album controls, and span pickers as named groups.
- Studio focus: a visible ring on the dark bar (it was 2.6:1) and on inputs.
- Keyboard:
  - **Move to…** waits for its button (a Windows arrow key used to move the
    block);
  - span pickers keep focus while saving;
  - a picked-up drag handle cancels when focus leaves it;
  - a YouTube or Vimeo player takes focus when it replaces its play button.
- Status messages: publishing state and upload progress are announced
  politely, load errors are alerts, and the rich-text error no longer
  interrupts typing.
- Removing a placement or an album image asks first.
- About and Contact slots, media search and span controls fit 320px.
- Firefox no longer logs a CSP eval violation: Zod runs jitless.

**Already correct:**

- one `<main>` and one `h1` per page, with landmarks and titles;
- `alt` everywhere, with decorative images `alt=""`;
- the private gate's label, error association and focus return;
- click-to-play buttons of 56px or more;
- reduced motion honoured by every loop;
- keyboard alternatives for every drag, and a native modal media picker;
- text contrast: public muted text 5.0:1, Studio muted text 5.3:1 or more.

**For the owner (B):** autoplaying loops (the Home hero and wall, project
loops, Works previews) have no on-page pause control. WCAG 2.2.2 asks for one
for motion over five seconds beside other content. `prefers-reduced-motion`
already stops every loop, but a visible "pause motion" control is part of the
locked visual design. Recommended: a small text control in the footer or
header that sets the same state reduced motion does.

**Remaining minor (technical debt):**

- every public video button is named "Play video", without its caption;
- **Replace** on a placement is two requests. The API has no atomic replace,
  and single-media blocks refuse a second item.

## 5. Security

- **Headers.** CSP (no eval, `frame-ancestors 'self'`), HSTS,
  Referrer-Policy, nosniff, `X-Frame-Options`, COOP and Permissions-Policy
  were re-checked in production. `/admin` and `/api` answer
  `X-Robots-Tag: noindex, nofollow`. Private gates and previews carry a
  robots `noindex`.
- **CSRF.** A cross-origin mutation is refused with 403 `CSRF_REJECTED`.
- **Access and sessions.** Sessions are `HttpOnly; Secure; SameSite=Strict`,
  server-side and revocable. The private gate is rate-limited and labelled,
  wrong passwords are announced, and access is still verified on every
  request.
- **Dependencies.** `npm audit --omit=dev`: 0 vulnerabilities. The whole tree
  has 4 moderate advisories, all in dev-only `drizzle-kit` (the esbuild
  dev-server issue). It is not reachable from the site. The only fix is a
  breaking downgrade, so it is left.
- **Static HTML.** Vercel adds `Access-Control-Allow-Origin: *` to static
  prerendered HTML. It is public content without credentials, and no API
  response carries it.
- **Uploads.** Provider-verified checksums are ready behind a switch
  (`docs/operations/media-lifecycle.md` §4).

## 6. Performance

Measured on a production build over a restored production database (local,
reduced motion). Budgets are what the site stays within today; exceeding one
is a review trigger, not a failure.

| Measure | Now | Budget |
|---|---|---|
| Public JS per route (uncompressed) | 506–556 KB (Next 16 + React 19) | ≤ 600 KB |
| Public CSS per route | 44–54 KB | ≤ 80 KB |
| Fonts per route | 286 KB (313 KB where latin-ext is used); was 526 KB | ≤ 350 KB |
| LCP (local) | 140–430 ms | ≤ 2.5 s on 4G (field) |
| CLS | 0.0000 on every route | ≤ 0.05 |
| Studio code in public bundles | none | none |

- **Fonts.** Only the latin subset is preloaded now. latin-ext and
  Vietnamese remain declared and load by unicode-range when a page uses them.
  Rendering is unchanged.
- **Media.** Public media are served from R2 with
  `Cache-Control: public, max-age=31536000, immutable`, and video answers
  byte ranges (206).
- **Uploads.** New Studio uploads carry no `Cache-Control` of their own: CORS
  allows only `content-type` on the PUT. Their keys are immutable. When the
  media domain exists, a free Cloudflare cache rule can give them the same
  policy (`domains.md`).
- **Unchanged by design.** Images are served unoptimised, at their authored
  size (the filmmaking imagery is not recompressed). Autoplay stays bounded by
  the visibility strategy (ADR-0008).

## 7. SEO and social

- Every public page has a title, a canonical URL and full Open Graph
  (`og:url`, `og:locale`, site name). Twitter cards follow Open Graph.
- Share images: Home uses the hero poster; About the portrait; projects and
  albums their cover.
- Home's description is its published identity lead.
- **Structured data.** Home carries `WebSite` and `Person` JSON-LD, with the
  name and the address only. `CreativeWork` and `VideoObject` were not added:
  they would need facts the site does not hold (upload dates, durations for
  every film, descriptions) and must not be invented.
- **Sitemap and robots.** The sitemap lists public pages, PUBLIC published
  projects and published albums. Robots keep crawlers out of `/admin` and
  `/api`. Private gates, previews and the Studio are noindex.
- **Page metadata.** `pages.seo_title` and `seo_description` are still not
  editable in the Studio (technical debt).

## 8. Favicon and brand asset

No approved favicon or brand mark exists in the repository or the design
documents, and none was invented. Browsers request `/favicon.ico` and get
404. **Owner decision:** supply a mark, and it goes in as
`src/app/icon.png` (plus `apple-icon.png`).

## 9. Cross-browser and device QA

Run locally against the restored production copy:

- Public routes, album pages and the private gate, in Chromium at 1440,
  1280, 834, 390 and 320, and in Firefox and WebKit at 1440 and 390.
- Studio routes in Chromium and Firefox.
- In total, 178 checks passed: status, overflow, `h1` and `main`, `alt`,
  broken images, console errors and noindex.
- Studio interactions in Chromium and Firefox all passed: keyboard reorder,
  blur-cancel, **Move to…**, the unsaved-changes guard, and edits kept across
  saves.

WebKit keeps no `Secure` cookie on `http://localhost`, so its Studio run
happens against production over https (`deployment.md` §10).

## 10. Owner actions

1. Approve (or change) the album page design, and decide whether albums are
   linked anywhere.
2. Decide on a visible pause-motion control (§4).
3. Supply a favicon or brand mark (§8).
4. Letterbox on locked surfaces: supply reviewed references if ever needed
   (§1).
5. Upload checksums: add `x-amz-checksum-sha256` to both buckets' CORS
   AllowedHeaders, then set `S3_UPLOAD_CHECKSUMS=true`
   (`media-lifecycle.md` §4).
6. Domains: buy or choose one, then follow `docs/operations/domains.md`.
7. Media cleanup: after 2026-10-24, the dry run will name the soft-deleted
   smoke PNG. Approve `media:gc --apply` or leave it.
8. Smoke artifacts: archived smoke projects can be soft-deleted from the
   Studio (**Delete project**) whenever wanted (`deployment.md` §7).
