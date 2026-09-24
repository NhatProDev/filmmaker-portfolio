import type { Database } from "@db/client";
import { createPublicationRepository } from "@/features/project-builder/publication.repository";
import { verifyPassword } from "@/lib/auth/password";
import { sha256Hex, sign, verifySigned } from "@/lib/auth/tokens";
import { DomainError, notFound } from "@/lib/errors/domain-error";
import { createRateLimiter, type RateLimitRule } from "@/lib/rate-limit/rate-limit";
import { accessCookieName } from "./access-cookie";

// Private-project access (CLAUDE.md §11, ADR-0003). A visitor who knows the
// project's address and password receives a signed, HttpOnly cookie that
// grants access to that project only, for a limited time. It is not an
// account and shares nothing with admin authentication.
//
// The cookie is named after the slug so that the edge proxy can route a
// holder to the dynamic, access-checked render without a database lookup;
// its value names the project and is bound to the current password hash, so
// replacing the password revokes every access granted before.

export const ACCESS_TTL_SECONDS = 12 * 60 * 60;
export { accessCookieName };

const PER_ADDRESS: RateLimitRule = { limit: 10, windowSeconds: 15 * 60 };
const PER_PROJECT: RateLimitRule = { limit: 100, windowSeconds: 15 * 60 };

const fingerprint = (passwordHash: string) => sha256Hex(passwordHash).slice(0, 16);

export type AccessGrant = { cookieName: string; cookieValue: string; maxAgeSeconds: number };

export function createProjectAccessService(db: Database, secret: string | undefined) {
  const publications = createPublicationRepository(db);
  const limiter = createRateLimiter(db);

  // Only a published, live PRIVATE project with a password can be unlocked.
  // Anything else is simply not found, so the endpoint reveals nothing.
  async function unlockable(slug: string) {
    const row = await publications.findPublishedBySlug(slug);
    if (!row || row.project.visibility !== "PRIVATE" || !row.project.passwordHash) return null;
    return { id: row.project.id, passwordHash: row.project.passwordHash };
  }

  return {
    async unlock(slug: string, password: string, clientAddress: string): Promise<AccessGrant> {
      const project = await unlockable(slug);
      if (!project) throw notFound("NOT_FOUND", "Not found.");
      if (!secret) {
        throw new DomainError("UNAVAILABLE", "ACCESS_UNAVAILABLE", "Private projects cannot be opened right now.");
      }
      for (const [key, rule] of [
        [`access:${project.id}:${clientAddress}`, PER_ADDRESS],
        [`access:${project.id}`, PER_PROJECT],
      ] as const) {
        const result = await limiter.consume(key, rule);
        if (!result.allowed) {
          throw new DomainError("RATE_LIMITED", "RATE_LIMITED", "Too many attempts. Please wait and try again.", {
            retryAfterSeconds: result.retryAfterSeconds,
          });
        }
      }
      if (!(await verifyPassword(password, project.passwordHash))) {
        throw new DomainError("UNAUTHENTICATED", "INVALID_PROJECT_PASSWORD", "That password does not open this work.");
      }
      await limiter.reset(`access:${project.id}:${clientAddress}`);
      const expires = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
      return {
        cookieName: accessCookieName(slug),
        cookieValue: sign(secret, `${project.id}:${expires}:${fingerprint(project.passwordHash)}`),
        maxAgeSeconds: ACCESS_TTL_SECONDS,
      };
    },

    // The project a cookie value grants access to, if it is still valid for
    // this slug: signature, expiry, project and current password all checked.
    async verify(slug: string, cookieValue: string | null | undefined): Promise<{ projectId: string } | null> {
      if (!secret || !cookieValue || cookieValue.length > 500) return null;
      const payload = verifySigned(secret, cookieValue);
      if (!payload) return null;
      const [projectId, expires, print] = payload.split(":");
      if (!projectId || !print || !(Number(expires) > Date.now() / 1000)) return null;
      const project = await unlockable(slug);
      if (!project || project.id !== projectId || fingerprint(project.passwordHash) !== print) return null;
      return { projectId };
    },
  };
}

export type ProjectAccessService = ReturnType<typeof createProjectAccessService>;
