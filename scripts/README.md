# scripts/

Operational scripts. Not application code, not shipped to the client bundle.
Every script that writes connects **only to a local development database**
(localhost, 127.0.0.1, ::1 or a local socket). A `DATABASE_URL` that merely
exists is not permission to change the database it names.

| Command | Script | Does |
|---|---|---|
| `npm run db:migrate` | `db-migrate.ts` | Applies pending migrations from `db/migrations`. A second run applies nothing. |
| `npm run db:import` | `import-static-content.ts` | Dry run of the static-content import: inventory, de-duplication by checksum, plan. Add `-- --apply` to create what is missing. The import is create-only and idempotent. It publishes what it imports once (ADR-0012), and reports drift instead of overwriting it. |
| `npm run db:seed-admin` | `seed-admin.ts` | Creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`, or resets an existing admin's password and revokes its sessions. There is no registration endpoint (CLAUDE.md §11, §19). The password is hashed with Argon2id and never printed. |
| `npm run db:verify` | `verify-content.ts` | Read-only. Compares every public route the database serves (published snapshots) with the committed static content, by media content. It exits non-zero on any difference. |

`lib/` holds what these share: the import plan, file probing (SHA-256,
dimensions, duration), the local-database guard, and the content comparison
that `tests/import-and-parity.test.ts` also uses.

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
verification. Production cutover also needs a production database and a
storage provider. Both are Phase 2G decisions, and none of these scripts
connects to a non-local database.
