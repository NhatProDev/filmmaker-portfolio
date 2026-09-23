import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { Database } from "@db/client";
import { adminSessions, adminUsers } from "@db/schema";

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

const userColumns = {
  id: adminUsers.id,
  email: adminUsers.email,
  name: adminUsers.name,
  createdAt: adminUsers.createdAt,
  updatedAt: adminUsers.updatedAt,
  lastLoginAt: adminUsers.lastLoginAt,
};

export function createAuthRepository(db: Database) {
  return {
    // The one place a password hash is read; it never leaves the service.
    async findCredentialsByEmail(email: string): Promise<(AdminUserRecord & { passwordHash: string }) | null> {
      const [row] = await db
        .select({ ...userColumns, passwordHash: adminUsers.passwordHash })
        .from(adminUsers)
        .where(eq(adminUsers.email, email));
      return row ?? null;
    },

    async touchLastLogin(id: string) {
      await db.update(adminUsers).set({ lastLoginAt: sql`now()` }).where(eq(adminUsers.id, id));
    },

    // Creates the admin, or replaces the password of an existing one.
    async upsertAdmin(email: string, passwordHash: string, name: string | null): Promise<{ id: string; created: boolean }> {
      const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
      if (existing) {
        await db
          .update(adminUsers)
          .set({ passwordHash, ...(name ? { name } : {}), updatedAt: sql`now()` })
          .where(eq(adminUsers.id, existing.id));
        return { id: existing.id, created: false };
      }
      const [row] = await db.insert(adminUsers).values({ email, passwordHash, name }).returning({ id: adminUsers.id });
      return { id: row.id, created: true };
    },

    async insertSession(input: { adminUserId: string; tokenHash: string; expiresAt: Date; userAgent: string | null }) {
      await db.insert(adminSessions).values(input);
    },

    // A session that is neither revoked nor expired, with its admin.
    async findActiveSession(tokenHash: string): Promise<{ sessionId: string; lastSeenAt: Date; admin: AdminUserRecord } | null> {
      const [row] = await db
        .select({ sessionId: adminSessions.id, lastSeenAt: adminSessions.lastSeenAt, admin: userColumns })
        .from(adminSessions)
        .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
        .where(
          and(
            eq(adminSessions.tokenHash, tokenHash),
            isNull(adminSessions.revokedAt),
            gt(adminSessions.expiresAt, sql`now()`),
          ),
        );
      return row ?? null;
    },

    async touchSession(sessionId: string) {
      await db.update(adminSessions).set({ lastSeenAt: sql`now()` }).where(eq(adminSessions.id, sessionId));
    },

    async revokeSession(tokenHash: string) {
      await db
        .update(adminSessions)
        .set({ revokedAt: sql`now()` })
        .where(and(eq(adminSessions.tokenHash, tokenHash), isNull(adminSessions.revokedAt)));
    },

    async revokeAllSessions(adminUserId: string) {
      await db
        .update(adminSessions)
        .set({ revokedAt: sql`now()` })
        .where(and(eq(adminSessions.adminUserId, adminUserId), isNull(adminSessions.revokedAt)));
    },

    // Housekeeping: sessions that can no longer authenticate.
    async deleteDeadSessions(olderThanDays: number) {
      const cutoff = sql`now() - make_interval(days => ${olderThanDays})`;
      await db
        .delete(adminSessions)
        .where(or(lt(adminSessions.expiresAt, cutoff), lt(adminSessions.revokedAt, cutoff)));
    },
  };
}
