import { getDatabase } from "@db/client";
import { serverEnv } from "@/lib/env/server-env";
import { createDbGateway } from "./db-gateway";
import type { ContentGateway } from "./site-content.types";
import { staticGateway } from "./static-gateway";

let dbGateway: ContentGateway | undefined;

// The one place that chooses where public content comes from, by
// SITE_CONTENT_ADAPTER: "static" (the default, no database needed) or "db". An
// unknown value fails the environment validation; there is no silent fallback
// from one adapter to the other.
export function getContentGateway(): ContentGateway {
  if (serverEnv().SITE_CONTENT_ADAPTER === "db") {
    dbGateway ??= createDbGateway(getDatabase());
    return dbGateway;
  }
  return staticGateway;
}
