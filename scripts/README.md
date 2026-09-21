# scripts/

Operational scripts. Not application code, not shipped to the client bundle.

## Reserved

### `seed-admin.ts` — not yet written

Creates the initial admin user from environment variables.

Reserved per architect decision Q12 and CLAUDE.md §11 "Admin provisioning".
There is no public admin registration endpoint and none may be added
(CLAUDE.md §19).

When implemented it must:

- read credentials from environment variables, never from arguments or a
  committed file
- hash with Argon2id (bcrypt acceptable only if deployment constrains it),
  per CLAUDE.md §16
- never log the plaintext password
- be idempotent, or fail clearly if an admin already exists
- write through the same schema as the application (`db/schema.ts`)
