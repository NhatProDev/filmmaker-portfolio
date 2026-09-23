// Creates the initial admin, or resets an admin's password (CLAUDE.md §11).
// There is no registration endpoint; this script is the only way in.
//
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed-admin
//
// Reads ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters) and optional ADMIN_NAME
// from the environment (or .env.local). The password is hashed with Argon2id
// and never printed. Re-running for an existing email replaces its password and
// revokes every session of that admin. Writes only to a local development
// database, like the other database scripts.

import { z } from "zod";
import { createDatabase } from "@db/client";
import { adminPasswordSchema, createAuthService } from "@/features/authentication/auth.service";
import { serverEnv } from "@/lib/env/server-env";
import { assertLocalDatabaseUrl, describeDatabase } from "./lib/database-target";

const input = z.object({
  ADMIN_EMAIL: z.email("ADMIN_EMAIL must be an email address"),
  ADMIN_PASSWORD: adminPasswordSchema,
  ADMIN_NAME: z.string().trim().max(200).optional(),
});

async function main() {
  const parsed = input.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid admin input:\n${z.prettifyError(parsed.error)}`);
  const { DATABASE_URL } = serverEnv();
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const target = assertLocalDatabaseUrl(DATABASE_URL);
  const handle = createDatabase(DATABASE_URL, { max: 1 });
  try {
    console.log(`TARGET  ${target.host}/${target.database}  ${await describeDatabase(handle.db)}`);
    const result = await createAuthService(handle.db).provisionAdmin({
      email: parsed.data.ADMIN_EMAIL,
      password: parsed.data.ADMIN_PASSWORD,
      name: parsed.data.ADMIN_NAME || null,
    });
    console.log(
      result.created
        ? `Created admin ${result.email}.`
        : `Updated the password of admin ${result.email}; its existing sessions were revoked.`,
    );
  } finally {
    await handle.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
