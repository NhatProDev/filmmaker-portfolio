import { serverEnv } from "@/lib/env/server-env";

// The public origin canonical links, the sitemap and Open Graph URLs resolve
// against. SITE_URL in production; a local default otherwise.
export function siteUrl(): string {
  return serverEnv().SITE_URL ?? "http://localhost:3000";
}
