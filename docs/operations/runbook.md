# Operations runbook

Every database script refuses a non-local database unless the command line
names the exact target: `--confirm-remote=<host>/<database>`
(`scripts/lib/database-target.ts`). Finding a `DATABASE_URL` is never
permission. Nothing reads the confirmation from the environment, so it cannot
be left switched on. **Take a backup (§4) before any remote write.**

The commands below are written for the production target
`<host>/<database>`; substitute the real values. In production they run with
the Git-ignored `.env.prod-ops` (`environment.md`, Secrets handling), not
`.env.local`: `npx tsx --env-file=.env.prod-ops scripts/db-migrate.ts --confirm-remote=…`.

## 1. Migrate

```text
npm run db:migrate -- --confirm-remote=<host>/<database>
```

Applies pending migrations from `db/migrations` in one transaction; a second
run applies nothing. Migrations are additive (CLAUDE.md §6); a destructive one
needs its own reviewed plan. Run it **before** deploying code that needs the
new schema. `/api/v1/health` reports `schema: behind` (503, unavailable)
until it has run and `ahead` (200, degraded) while older code runs against
the newer schema.

## 2. Content import (first deployment only)

```text
npm run db:import -- --confirm-remote=<host>/<database>             review the plan
npm run db:import -- --apply --confirm-remote=<host>/<database>
```

Create-only and idempotent: it never overwrites or deletes, and reports drift
instead. It reads media files from `public/media`, so run it from a checkout
that has them. It records storage keys; the files themselves are uploaded with
the media migration (`media-migration.md`).

## 3. Seed the admin

```text
ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:seed-admin -- --confirm-remote=<host>/<database>
```

Creates the admin, or replaces the password and revokes that admin's sessions.
Clear `ADMIN_PASSWORD` from the shell afterwards.

## 4. Backup

Before every migration, import or restore, and on a schedule:

```text
pg_dump --format=custom --no-owner --no-privileges \
  --file=portfolio-$(date +%Y%m%d-%H%M).dump "$DATABASE_URL_DIRECT"
```

- Use the provider's **direct** (non-pooled) connection string for `pg_dump`.
- Without a local PostgreSQL 17 client, run it from the `postgres:17` image.
  The image has no CA bundle. Mount one so that `sslmode=verify-full` still
  checks Neon's certificate; never drop to `require`. Keep backups outside
  the repository:
  ```text
  docker run --rm -e PGURL -v "<ca-bundle.crt>:/ca.crt:ro" -v "<backups dir>:/backups" postgres:17     pg_dump --format=custom --no-owner --no-privileges --file=/backups/portfolio-<UTC>.dump "$PGURL"
  ```
  Here `PGURL` is the direct URL with `sslmode=verify-full&sslrootcert=/ca.crt`.
  Git for Windows ships a bundle at `/mingw64/etc/ssl/certs/ca-bundle.crt`.
- Neon also keeps a point-in-time restore window (length by plan — verify at
  2G-B); a branch at a timestamp is the quickest restore rehearsal.
- Media: storage is the source of truth for files. Enable R2/S3 bucket
  versioning or a periodic copy of both buckets; the database holds only keys
  and checksums.

## 5. Provisioning sequence (2G-B, after approval)

1. Create the database (Neon), the two buckets (R2) with the public bucket on
   the media domain, and a storage token scoped to both buckets.
2. CORS on the **public** and **private** buckets: allow `PUT` and `GET` from
   `SITE_URL` (uploads come from the Studio; private delivery is a redirect,
   so the browser fetches the private bucket directly).
3. Set the environment (`environment.md`); `npm run env:check -- --production`
   must pass.
4. §1 migrate, §2 import, §3 seed admin — each with `--confirm-remote`.
5. Upload media per `media-migration.md`, then run
   `npm run db:health -- --confirm-remote=<host>/<database>`.
6. Deploy the application; check `GET /api/v1/health` is `ok`.
7. Smoke test: every public route, a private project's gate and unlock,
   Studio sign-in, a draft preview, one Publish, and that the published page
   answers at once.

## 6. Health verification

- `GET /api/v1/health` — public, uncached: `database`, `schema`, `storage`
  states, and `release`, the first 12 hex digits of the deployed commit
  (null off Vercel). It answers 503 when the site cannot serve. Point the
  platform's health check at it. After a push, `release` must equal
  `git rev-parse --short=12 HEAD` before the release is tagged.
- `npm run db:health` — deeper and read-only: migrations match, every
  published snapshot still validates and renders, every needed media file is
  present (local adapter) — for after a deploy, migration, import or restore.
- `npm run media:manifest` — the media-to-database consistency report (§8).

## 7. Restore

1. Put the Studio out of use (no publishing during the restore).
2. Restore into a **new** database (or Neon branch), never over the live one:
   `pg_restore --no-owner --no-privileges --dbname="$NEW_DATABASE_URL" portfolio-….dump`
3. `npm run db:health -- --confirm-remote=<new-host>/<database>` must pass.
4. Point `DATABASE_URL` at the restored database and redeploy (the pages
   prerender from it).
5. Keep the old database until the site is verified.

**Restore drill** (disposable container, never the live database):

```text
docker run -d --name portfolio-restore-drill -e POSTGRES_PASSWORD=drill   -p 127.0.0.1:55432:5432 -v "<backups dir>:/backups:ro" postgres:17
docker exec portfolio-restore-drill sh -c "createdb -U postgres restored &&   pg_restore --no-owner --no-privileges -U postgres --dbname=restored /backups/<file>.dump"
DATABASE_URL=postgres://postgres:drill@127.0.0.1:55432/restored SITE_CONTENT_ADAPTER=db npm run db:health
DATABASE_URL=postgres://postgres:drill@127.0.0.1:55432/restored SITE_CONTENT_ADAPTER=db npm run db:verify
docker rm -f portfolio-restore-drill
```

Last drill: 2026-09-24 (Phase 3D). The dump
`portfolio-20260924-1938Z-pre3d.dump` restored completely into
`postgres:17`. `db:health` was healthy (9 project snapshots, 4 pages,
0 albums, 26 media files needed, 0 missing). `db:verify` found 14 of 14 routes
identical. Earlier drills: `…-1224Z` (2G-B) and `…-1853Z-pre3c` (3C).

Backups are kept outside the repository, in `E:ile cua choeportfolio-backups`
on the operator machine. Copy them somewhere off that machine too: Neon Free
keeps only 6 hours of point-in-time restore.

Media are not part of a database restore. Restored rows reference keys; if a
key's object is gone, `db:health` names it. Bucket versioning restores it.

## 8. Rollback

- **Code:** redeploy the previous build or tag (`git tag` lists the phase tags:
  `public-frontend-v1`, `phase-2f-cms-v1`, …). A rollback across a migration is
  safe only while migrations are additive: older code ignores new columns. The
  health endpoint reports `schema: ahead`; that is expected and harmless for an
  additive migration.
- **Content:** there is no revision history (CLAUDE.md §19). To undo a publish,
  edit the working copy back and publish again, or Unpublish.
- **Database:** §7.

## 8a. Neon point-in-time restore

Neon Free keeps 6 hours of history. Within that window, a Neon **branch at a
timestamp** is the fastest way to recover from a bad write:

1. create the branch;
2. run `db:health` against it;
3. repoint `DATABASE_URL` to it and redeploy.

Past 6 hours, `pg_dump` backups (§4) are the only path. Do not assume object
versioning in R2. Treat a removed object as recoverable only from the local
media sources (`imgs & videos/`, `public/media`) or a copy of the bucket. `media:gc` therefore never removes without `--apply` and
explicit bucket confirmation.

## 9. Media and database consistency

`npm run media:manifest -- --out=manifest.json` lists every asset with its
checksum, current source, future key, audience (public / private /
unreferenced), usages and posters, and reports missing files, duplicates,
target collisions and recorded metadata that disagrees with the file. It exits
non-zero on missing files or collisions. Run it before and after any media
move.

## 10. Storage-provider realignment (ADR-0020)

Rows imported before production storage existed record the `local`
provider, although their files now live in R2. The Studio then shows no
thumbnail for them. Take a backup (§4), then:

```text
npm run media:realign-provider -- --confirm-remote=<host>/<database>           dry run
npm run media:realign-provider -- --apply --confirm-remote=<host>/<database>
npm run media:realign-provider -- --confirm-remote=<host>/<database>           must find nothing
```

- It runs with production's storage variables, so it can confirm each object
  with a HEAD request.
- It changes a row only once its object is confirmed, and it rewrites the
  snapshots' copies of that record in the same transaction.
- Afterwards no page reports unpublished changes, and `db:health` passes.
- A row whose object is missing is reported, left unchanged, and makes the
  script exit with code 2.

It was rehearsed on 2026-09-24 against a restored production dump, with the
production bucket used read-only: 22 rows and 10 snapshots were realigned,
with 0 drift, and a second run was a no-op.

## 11. Media lifecycle

`npm run media:gc` lists both buckets and every database reference, and names
what nothing needs any more:

- probes;
- abandoned uploads;
- soft-deleted assets past the grace period;
- orphans.

It removes nothing without `--apply` and `--confirm-storage`. Procedure,
rules and the upload-integrity switch: `media-lifecycle.md`.
