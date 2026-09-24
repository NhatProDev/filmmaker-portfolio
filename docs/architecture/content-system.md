# Content system — implementation record (Phase 3C)

- **Status:** Implementation record for ADR-0017 to ADR-0020. It decides
  nothing those ADRs did not approve, and records the two evaluations the
  Phase 3C brief asked for (§7, §8). `openapi.yaml` 1.4.0. Migrations `0009`
  and `0010` are additive.
- **Branch:** `phase-3c-content-system`. It is local only and **not deployed**;
  §11 lists the deployment steps.

## 1. What changed for visitors

Nothing, until an admin publishes. Measured against the Phase 3B build on a
restored production dump, all 17 routes at three widths show 0 markup
differences and 0 screenshot differences. About, Contact and the site settings
render their committed content until each is first published.

After those three are published through the Studio, the screenshots stay
identical. Two things change in the markup:

- About's and Contact's four stills are served as the Media Library assets
  with the same bytes, so their `src` paths change.
- React emits one invisible text separator (`<!-- -->`) where an HTML flush
  boundary now falls.

Albums add `/albums` and `/albums/<slug>`. Both answer 404 until an album is
published, and neither is linked from the site.

## 2. About, Contact and site settings (ADR-0017)

- `pages` rows `ABOUT`, `CONTACT`, `SITE` hold strict structured `content`.
  Their images sit in closed slots in `page_media`. The schemas and slots are in
  `src/features/page-content/page-content.schema.ts`.
- Each page is published like Home (`page_publications`, `publication_media`).
  `pageSnapshotIssues` dispatches by key. Publishing SITE updates every page
  that shows its values: the email on Home's footer, About and Contact, Home's
  footer line, and the Contact footer.
- Text is stored exactly as written. An inline run's edge space is part of the
  sentence, and the parity test caught a trim that removed one.
- `db:import` creates the three working copies from the committed files
  (`scripts/lib/page-content-import.ts`, `src/features/page-content/committed.ts`).
  It is create-only, reuses assets by checksum, and a second run is a no-op. On
  the restored production dump it created 0 media.
- The Studio's editors (`/admin/about`, `/admin/contact`, `/admin/settings`)
  start from the committed content while a page has none of its own.

## 3. Home composer (ADR-0018)

- `HomeContent` is `{ sections, footer }`. `homeContent()` maps each block to
  one of the five Home sections and enforces two rules: the hero is first and
  appears once, and the identity appears exactly once. Any other block is
  refused with the reason.
- `/admin/home` is the project composer owned by the page (`owner.ts`). It
  offers Home's sections only, created whole from their words, and edits each
  with its own editor (`HomeEditors.tsx`).
- No data changed. The published Home renders the same markup.

## 4. Albums (ADR-0019)

- `src/features/albums/*`: repository, service (ordering, insertion, publish),
  snapshot. `album-projection.ts` renders the public view.
- Items are live READY images, once per album. Insertion follows ADR-0005 and
  reorder follows ADR-0002.
- `MEDIA_IN_USE` covers items (`ALBUM_ITEM`), covers (`ALBUM_COVER`) and live
  snapshots (`PUBLISHED_ALBUM`).
- The related project is live. It is shown only while the project is
  published and PUBLIC.
- `src/proxy.ts` routes `/albums/<slug>` by a 10-second slug index
  (`createAlbumRouter`). Unknown slugs get the prerendered 404.
- The pages are assembled from the existing system and need a design review
  before they are linked (see §12).

## 5. Private uploads and the Media Studio (ADR-0020)

- `POST /media/uploads` takes `audience`. A PRIVATE original is signed for the
  private bucket under `private/`. The DTOs carry `isPrivate`, and the Studio
  previews private images through the admin-only signed route.
- `POST /media/{id}/complete` takes what the browser measured: size, a video's
  frame and duration, and the SHA-256.
  - **Before this, a Studio upload could never be published.** Images had no
    size, and videos stayed `PROCESSING`.
  - The stored size must equal the authorised size.
  - The checksum is the provider's if it has one, otherwise the declared one.
    Duplicates are therefore still found with S3, and a duplicate upload is
    discarded.
- Publish validation follows the project's audience. A PRIVATE project may
  publish private media, and serves them through its access-checked route. A
  project whose live version uses private media cannot be made PUBLIC
  (`409 PROJECT_NOT_PUBLIC_READY`).
- The Media Library gained:
  - several files per upload, with progress;
  - a choice of audience;
  - a "Show it" link on a duplicate;
  - an audience filter, private badges in the library and the picker;
  - usage lines for page slots and albums.
- CORS was verified read-only against both production buckets with a preflight:
  the site's origin may `PUT` with `content-type`, and a foreign origin is
  refused.
- `media:realign-provider` fixes production's 22 imported rows, which are
  recorded under `local` although R2 holds their files. It was rehearsed on the
  restored dump against the production bucket, read-only: 22 rows and 10
  snapshots were realigned, 0 drift, and a second run was a no-op.

## 6. Reusable patterns (3C-9)

`src/features/project-builder/patterns.ts` defines four patterns:

- text and still;
- film and credits;
- editorial image pair;
- gallery section.

Each inserts ordinary blocks in one request. Like templates (ADR-0013 §1),
they are copied once and never linked. They are offered on projects only;
Home is built from its own sections.

## 7. Letterbox on locked surfaces (3C-7): design-review blocker

**Evaluated, not implemented.** ADR-0016's active picture applies on the
generic renderer. The locked opening (`ProjectOpening`, cover under the title),
the Project Detail presets (`projectStills`, `projectLoop`, `projectCoda`),
Home's sections and `JUSTIFIED_ROWS` still render every asset as encoded
(ADR-0016 Decision 4).

- **Parity is provable only while no active picture is set.** In that case
  the renderer is the identity, and that is today's state: 0 of 22 production
  assets declare one.
- As soon as a value is set on an asset one of these surfaces shows, the
  crop changes. That changes the opening's frame (and so the derived title
  placement), a still's proportions inside a fixed four-up row, the loop's
  poster-to-video swap, the Home hero's full-bleed crop, and the row packing
  of justified rows (which is computed from aspect ratios).
- None of these results has an approved reference to prove it against. Each
  is a new visual decision, not a closed preset of an existing one. A closed
  preset could only fix *which* surfaces honour the area; it cannot make the
  cropped result match a design that does not exist.

**Needed to unblock:** for each surface, a reviewed reference (prototype or
screenshot) of a letterboxed master framed by its active picture. Then the
renderer rule can be extended per surface and regression-tested against those
references. Until then, the Studio's Picture area control keeps advising a
clean re-export and says which pages apply it.

## 8. Video in justified rows (3C-8): deferred

**Evaluated, not implemented.** Justified rows stay stills-only, and Publish
still refuses video there (`project-blocks.ts`). The brief's conditions are
not all met:

- **Geometry:** deterministic. Row packing needs only aspect ratios, and
  uploads now declare a video's frame (§5).
- **Poster:** undefined. A tile's size comes from the video's aspect, but its
  poster may have another aspect. Either the poster is cropped (a different
  picture from the one chosen) or the tile resizes on the swap, which is the
  layout jump ADR-0009 §5 forbids.
- **Playback:** undefined. A row of videos is a multi-video surface, so
  `AUTOPLAY_VISIBLE` or `CLICK_TO_PLAY` would apply (ADR-0008). No design says
  which one rows use. Click-to-play inside a packed row needs a play control
  that fits the smallest tile and keyboard order across rows. Autoplay needs
  the concurrency bound applied to a surface that can be long.
- **Accessibility:** a mixed row of stills and players has no specified focus
  and caption model.
- **Unchanged image behaviour:** achievable. The feature would only add a
  branch.

**Needed to unblock:**

- a design decision on poster fit (the poster must match the video's aspect,
  or be refused);
- the playback mode for rows;
- a reference for the play affordance at the smallest tile.

`VIDEO_GRID`, `HORIZONTAL_STRIP` and `SLIDESHOW` already cover video
galleries.

## 9. Studio

- **Navigation:** Projects, Albums, Home, About, Contact, Media, Settings. On
  phones the links scroll inside the bar instead of widening the page.
- **Overview:** `/admin` shows every content type with its publication state
  (not published / with changes / blocked / up to date) and counts. Sign-in
  lands there.
- **Validation:** the structured editors name each refused field, and the
  album editor explains that an empty album cannot be published.
- **Previews:** every public surface (Home, About, Contact, albums) previews
  its working copy through draft mode and an admin session.
- **Checked:** the Studio walkthroughs (`studio-3c.mjs`, `albums-3c.mjs`) ran
  at desktop, tablet and phone widths with no overflow and no console errors.

## 10. Verification

- 227 tests pass: typecheck, lint, and `drizzle-kit check`.
- On a fresh database, 0001–0010 apply, and a second run applies nothing.
- On the restored production dump, `0009` and `0010` apply and every snapshot
  still equals its working copy.
- The import is idempotent (projects 0 created / 50 unchanged; pages created,
  then unchanged).
- Public regression against the 3B build, before and after the cutover: §1.
- Albums: all public pages at three widths, 404 before publish and after
  unpublish, and the sitemap.

## 11. Deploying Phase 3C safely

Not done in Phase 3C. It needs the owner's approval, after the design reviews
in §12.

1. Review ADR-0017 to ADR-0020 and this record. Decide whether albums are
   linked anywhere (a design decision).
2. Take a backup: `pg_dump` from the direct connection (`runbook.md` §4).
3. **Rehearse on a restore of that dump:**
   - `db:migrate` (applies 0009 and 0010);
   - `media:realign-provider` as a dry run, then `--apply`, then a rerun that
     must find nothing (it needs production's storage variables);
   - `db:import --apply`: 0 projects created, three page working copies, 0
     media;
   - confirm that no snapshot reports unpublished changes, then run
     `db:health` and `db:verify`.
4. **Production, each step with `--confirm-remote=<host>/<database>`:**
   - `db:migrate`;
   - `media:realign-provider --apply`;
   - `db:import --apply`.

   Until the new code is live, health reports `schema: ahead`, which is
   `degraded`. The site keeps serving.
5. Merge into `main` and push. Vercel deploys. Wait until health is `ok`.
6. **Before publishing anything in the Studio:**
   - run the public regression against the 3B baseline (`prod-capture.mjs`
     and `prod-compare.mjs`); expect 0 differences;
   - run the unauthenticated checks (`prod-3b-public.mjs`, extended with the
     album routes).
7. In the Studio:
   - review Settings, About and Contact, and publish each;
   - run the regression again: expect identical screenshots, and only the
     image paths and the one text separator changed in the markup.
8. **Authenticated smoke with a temporary session** (the Part A recipe):
   - a real PRIVATE upload to the private bucket, then its preview, then its
     publish on a throwaway PRIVATE project;
   - an album on a throwaway slug: create, publish, view, unpublish, delete;
   - the Home composer: a reorder, then back;
   - revoke the session and delete the token file.
9. Tag `phase-3c-content-system-v1` on the deployed commit.
   `phase-3b-authoring-v1` remains the rollback point. Every 3C migration is
   additive, so 3B code runs on the migrated schema.

## 12. Not yet, and technical debt

- **Design reviews:**
  - the album pages (index and detail) before they are linked;
  - generic blocks on Home;
  - letterbox on locked surfaces (§7);
  - video in justified rows (§8).
- **Private albums:** a change to the access model (ADR-0019 §5).
- **Uploads:**
  - the browser-declared checksum is trusted when the provider keeps none (R2
    could verify `x-amz-checksum-sha256` on the signed PUT; not wired);
  - uploads that are abandoned stay `UPLOADING` (a cleanup job is not built);
  - a video whose frame the browser cannot read stays `PROCESSING`, and the
    Studio says so.
- **Images:** About's and Contact's images now use the shared asset's key. The
  old `about/…` and `contact/…` objects in R2 become unused once the pages are
  published. Removing them needs its own decision.
- **Page metadata:** `pages.seo_title` and `pages.seo_description` are not
  editable in the Studio. The site-wide default description stays in code.
- **Local testing:** the rehearsal database realigns providers to `s3`, while
  a local build serves `local` storage, so the Studio shows no thumbnails
  there. That is an environment artefact, not a defect.
