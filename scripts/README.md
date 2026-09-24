# scripts/

Operational scripts. Not application code, not shipped to the client bundle.
Every database script accepts a **local development database** (localhost,
127.0.0.1, ::1 or a local socket) and refuses any other unless the command line
names that exact target: `--confirm-remote=<host>/<database>`. A
`DATABASE_URL` that merely exists is not permission to use the database it
names. Production workflows: `docs/operations/runbook.md`.

| Command | Script | Does |
|---|---|---|
| `npm run db:migrate` | `db-migrate.ts` | Applies pending migrations from `db/migrations`. A second run applies nothing. |
| `npm run db:import` | `import-static-content.ts` | Dry run of the static-content import: inventory, de-duplication by checksum, plan. Add `-- --apply` to create what is missing. The import is create-only and idempotent. It publishes what it imports once (ADR-0012), and reports drift instead of overwriting it. |
| `npm run db:seed-admin` | `seed-admin.ts` | Creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`, or resets an existing admin's password and revokes its sessions. There is no registration endpoint (CLAUDE.md §11, §19). The password is hashed with Argon2id and never printed. |
| `npm run db:verify` | `verify-content.ts` | Read-only. Compares every public route the database serves (published snapshots) with the committed static content, by media content. It exits non-zero on any difference. |
| `npm run db:health` | `db-health.ts` | Read-only. Migrations match the code, every published snapshot validates and renders, every needed media file is present (local adapter). |
| `npm run media:manifest` | `media-manifest.ts` | Read-only dry run of the media migration: ids, checksums, sources, future keys, public/private audience, posters, usages, duplicates, missing files, collisions. `-- --out=file.json` writes the JSON. |
| `npm run media:upload` | `media-upload.ts` | Uploads a manifest's `deploy` entries to the s3 buckets. Dry run by default; `-- --apply` uploads. Create-only: an object with the same size and MD5 is left alone, one with other bytes is a conflict and never overwritten. The SHA-256 must still match the manifest before upload, and size + MD5 are checked after. `-- --verify-delivery` reads every public object back through `MEDIA_PUBLIC_BASE_URL` (SHA-256, Content-Type, video byte ranges). |
| `npm run storage:check` | `storage-check.ts` | Writes two probe objects, checks public delivery, private denial (anonymous, tampered and expired signatures), presigned access and CORS for `SITE_URL`, then deletes its probes. |
| `npm run env:check` | `check-env.ts` | Validates the environment and lists what is set (never secret values). `-- --production` also refuses anything a public deployment lacks. |
| `npm run media:realign-provider` | `media-realign-provider.ts` | Realigns media rows recorded under another provider than the one holding their files, snapshots included (runbook §10). Dry run by default. |
| `npm run media:gc` | `media-gc.ts` | Media lifecycle audit: lists both buckets and every reference, and names abandoned uploads, deleted assets and orphans past a grace period. Dry run by default; `-- --apply` needs `--confirm-storage=<public>+<private>` and stays under `--max-delete` (`docs/operations/media-lifecycle.md`). |

`lib/` holds what these share: the import plan, file probing (SHA-256,
dimensions, duration), the database target guard, the media manifest, and the
content comparison that `tests/import-and-parity.test.ts` also uses.

## Cutting a local environment over to the database

```text
1. DATABASE_URL=postgres://…@localhost/…      in .env.local
2. npm run db:migrate
3. npm run db:import                            review the plan
4. npm run db:import -- --apply
5. npm run db:verify                            14 of 14 routes identical
6. ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:seed-admin
7. PROJECT_ACCESS_SECRET=…                      in .env.local
8. SITE_CONTENT_ADAPTER=db npm run build        pages prerender from the database
```

The media files must be present in `public/media` for the import and the
verification.
