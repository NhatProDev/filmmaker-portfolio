import { defineConfig } from "drizzle-kit";

// Migration generation only. Migrations are applied by `npm run db:migrate`
// (scripts/db-migrate.ts), which checks the target database first; there is
// deliberately no dbCredentials here, so drizzle-kit cannot push or migrate on
// its own.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  strict: true,
});
