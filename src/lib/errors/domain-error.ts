// Errors a service raises for a known business outcome. Services never build
// HTTP responses (CLAUDE.md §4): the route layer maps `kind` to a status, and
// `code` is the stable, client-visible error code (CLAUDE.md §9).

export type DomainErrorKind =
  | "MALFORMED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_LARGE"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

export class DomainError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = (code: string, message: string) => new DomainError("NOT_FOUND", code, message);
export const conflict = (code: string, message: string, details: Record<string, unknown> | null = null) =>
  new DomainError("CONFLICT", code, message, details);
export const invalid = (code: string, message: string, details: Record<string, unknown> | null = null) =>
  new DomainError("VALIDATION", code, message, details);

// A validation failure in the standard shape: field-level issues.
export const validationError = (issues: { path: string; message: string }[]) =>
  new DomainError("VALIDATION", "VALIDATION_ERROR", "The request is invalid.", { issues });

// The PostgreSQL error code of a failed query, looking through the wrappers
// Drizzle and the drivers add.
export function databaseErrorCode(error: unknown): { code?: string; constraint?: string } {
  for (let current: unknown = error, depth = 0; current && depth < 4; depth++) {
    const candidate = current as { code?: unknown; constraint_name?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      const constraint = candidate.constraint_name ?? candidate.constraint;
      return { code: candidate.code, constraint: typeof constraint === "string" ? constraint : undefined };
    }
    current = candidate.cause;
  }
  return {};
}
