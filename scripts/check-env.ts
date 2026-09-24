// Validates the server environment (docs/operations/environment.md).
//
//   npm run env:check                    is the environment valid?
//   npm run env:check -- --production    ...and ready for a public deployment?
//
// Prints which variables are set, never their values.

import { parseServerEnv, productionIssues } from "@/lib/env/server-env";

const SECRETS = new Set(["DATABASE_URL", "PROJECT_ACCESS_SECRET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "ADMIN_PASSWORD"]);

const VARIABLES = [
  "SITE_CONTENT_ADAPTER",
  "SITE_URL",
  "DATABASE_URL",
  "DATABASE_POOL_MAX",
  "DATABASE_PREPARE",
  "PROJECT_ACCESS_SECRET",
  "APP_ORIGINS",
  "CLIENT_IP_HEADER",
  "TRUSTED_PROXY_HOPS",
  "MEDIA_STORAGE_PROVIDER",
  "MEDIA_PUBLIC_BASE_URL",
  "MEDIA_PRIVATE_ROOT",
  "MEDIA_SIGNED_URL_TTL_SECONDS",
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_PUBLIC_BUCKET",
  "S3_PRIVATE_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_FORCE_PATH_STYLE",
  "VIDEO_PROVIDER",
];

function main() {
  const production = process.argv.includes("--production");
  for (const name of VARIABLES) {
    const value = process.env[name];
    const shown = !value ? "(unset)" : SECRETS.has(name) ? "(set)" : value;
    console.log(`  ${name.padEnd(30)} ${shown}`);
  }
  const env = parseServerEnv(process.env);
  console.log("\nThe environment is valid.");
  if (!production) return;
  const issues = productionIssues(env);
  if (issues.length) {
    console.error("\nNot ready for production:");
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exitCode = 2;
  } else {
    console.log("Ready for production.");
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
