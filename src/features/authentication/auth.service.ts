import { z } from "zod";
import type { Database } from "@db/client";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { randomToken, sha256Hex } from "@/lib/auth/tokens";
import { DomainError } from "@/lib/errors/domain-error";
import { createRateLimiter, type RateLimitRule } from "@/lib/rate-limit/rate-limit";
import { createAuthRepository, type AdminUserRecord } from "./auth.repository";

// Admin authentication (CLAUDE.md §11). Admins are provisioned out of band by
// scripts/seed-admin.ts; there is no registration. Sessions are server-side
// and revocable, and the browser holds only an opaque token.

export const ADMIN_SESSION_COOKIE = "portfolio_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOUCH_AFTER_MS = 5 * 60 * 1000;

// Per client address, and per account so that rotating addresses does not
// lift the limit.
const LOGIN_PER_ADDRESS: RateLimitRule = { limit: 10, windowSeconds: 15 * 60 };
const LOGIN_PER_ACCOUNT: RateLimitRule = { limit: 30, windowSeconds: 15 * 60 };

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const loginRequestSchema = z.strictObject({
  email: z.string().trim().max(320).pipe(z.email()),
  password: z.string().min(1).max(200),
});

export const adminPasswordSchema = z.string().min(12, "must be at least 12 characters").max(200);

export type AdminPrincipal = AdminUserRecord;

export function createAuthService(db: Database) {
  const repository = createAuthRepository(db);
  const limiter = createRateLimiter(db);

  return {
    async login(input: { email: string; password: string; clientAddress: string; userAgent: string | null }) {
      const email = normalizeEmail(input.email);
      const addressKey = `login:address:${input.clientAddress}`;
      for (const [key, rule] of [
        [addressKey, LOGIN_PER_ADDRESS],
        [`login:account:${sha256Hex(email)}`, LOGIN_PER_ACCOUNT],
      ] as const) {
        const result = await limiter.consume(key, rule);
        if (!result.allowed) {
          throw new DomainError("RATE_LIMITED", "RATE_LIMITED", "Too many sign-in attempts. Try again later.", {
            retryAfterSeconds: result.retryAfterSeconds,
          });
        }
      }

      const account = await repository.findCredentialsByEmail(email);
      const valid = account
        ? await verifyPassword(input.password, account.passwordHash)
        : await verifyAgainstDummy(input.password);
      if (!account || !valid) {
        throw new DomainError("UNAUTHENTICATED", "INVALID_CREDENTIALS", "The email or password is incorrect.");
      }

      await limiter.reset(addressKey);
      const token = randomToken();
      const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000);
      await repository.insertSession({
        adminUserId: account.id,
        tokenHash: sha256Hex(token),
        expiresAt,
        userAgent: input.userAgent?.slice(0, 400) ?? null,
      });
      await repository.touchLastLogin(account.id);
      const admin: AdminPrincipal = {
        id: account.id,
        email: account.email,
        name: account.name,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        lastLoginAt: new Date(),
      };
      return { admin, token, expiresAt };
    },

    // The admin a session token belongs to, or null.
    async authenticate(token: string | null): Promise<AdminPrincipal | null> {
      if (!token || token.length > 200) return null;
      const session = await repository.findActiveSession(sha256Hex(token));
      if (!session) return null;
      if (Date.now() - session.lastSeenAt.getTime() > TOUCH_AFTER_MS) await repository.touchSession(session.sessionId);
      return session.admin;
    },

    async logout(token: string | null) {
      if (token && token.length <= 200) await repository.revokeSession(sha256Hex(token));
    },

    // Used by scripts/seed-admin.ts: creating or re-keying an admin revokes
    // every existing session of that admin.
    async provisionAdmin(input: { email: string; password: string; name: string | null }) {
      const email = normalizeEmail(z.email().parse(input.email));
      const password = adminPasswordSchema.parse(input.password);
      const result = await repository.upsertAdmin(email, await hashPassword(password), input.name);
      await repository.revokeAllSessions(result.id);
      await repository.deleteDeadSessions(30);
      return { ...result, email };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
