import { eq, sql } from "drizzle-orm";
import type { Database } from "@db/client";
import { rateLimits } from "@db/schema";

// Fixed-window attempt limits, counted in PostgreSQL so they hold across
// server instances (CLAUDE.md §11, §16). An attempt is counted before the
// password is checked, so a flood cannot buy unlimited Argon2 work.

export type RateLimitRule = { limit: number; windowSeconds: number };

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function createRateLimiter(db: Database) {
  return {
    // Counts one attempt against `key` and says whether it is within the rule.
    async consume(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
      const window = sql`make_interval(secs => ${rule.windowSeconds})`;
      const [row] = await db
        .insert(rateLimits)
        .values({ key, count: 1, windowStartedAt: sql`now()` })
        .onConflictDoUpdate({
          target: rateLimits.key,
          set: {
            count: sql`case when ${rateLimits.windowStartedAt} <= now() - ${window} then 1 else ${rateLimits.count} + 1 end`,
            windowStartedAt: sql`case when ${rateLimits.windowStartedAt} <= now() - ${window} then now() else ${rateLimits.windowStartedAt} end`,
          },
        })
        .returning({
          count: rateLimits.count,
          retryAfter: sql<number>`greatest(1, ceil(extract(epoch from (${rateLimits.windowStartedAt} + ${window} - now()))))::int`,
        });
      return row.count <= rule.limit ? { allowed: true } : { allowed: false, retryAfterSeconds: row.retryAfter };
    },

    // Clears a key, e.g. a client's failures after it succeeds.
    async reset(key: string): Promise<void> {
      await db.delete(rateLimits).where(eq(rateLimits.key, key));
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
