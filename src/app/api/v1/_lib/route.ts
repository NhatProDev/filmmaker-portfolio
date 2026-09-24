import { unstable_rethrow } from "next/navigation";
import { z, type ZodType } from "zod";
import { DatabaseUnavailableError, getDatabase, type Database } from "@db/client";
import { ADMIN_SESSION_COOKIE, createAuthService, type AdminPrincipal } from "@/features/authentication/auth.service";
import { BlockValidationError } from "@/features/project-builder/block.schema";
import { DomainError, databaseErrorCode, validationError } from "@/lib/errors/domain-error";
import { isSameOriginRequest, readCookie } from "@/lib/http/request";

// The HTTP boundary of /api/v1 (CLAUDE.md §4): CSRF and authentication checks,
// Zod validation of every input, the call into a service, and the mapping of
// known errors to status codes and the stable error envelope (§9, §10).
// Handlers stay thin; nothing here holds business rules.

const STATUS: Record<DomainError["kind"], number> = {
  MALFORMED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_LARGE: 413,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
};

const NO_STORE = { "cache-control": "no-store" };

export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(data, { status, headers: { ...NO_STORE, ...headers } });

export const noContent = (headers: HeadersInit = {}) => new Response(null, { status: 204, headers: { ...NO_STORE, ...headers } });

const envelope = (code: string, message: string, details: Record<string, unknown> | null = null) => ({
  error: { code, message, details },
});

export function errorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    const retry = error.details?.retryAfterSeconds;
    return json(envelope(error.code, error.message, error.details), STATUS[error.kind], {
      ...(typeof retry === "number" ? { "retry-after": String(retry) } : {}),
    });
  }
  if (error instanceof BlockValidationError) {
    return json(
      envelope("VALIDATION_ERROR", "The block is invalid.", {
        issues: error.issues.map((message) => ({ path: message.split(":")[0], message })),
      }),
      422,
    );
  }
  if (error instanceof DatabaseUnavailableError) {
    return json(envelope("DATABASE_UNAVAILABLE", "No database is configured for the Studio."), 503);
  }
  const { code } = databaseErrorCode(error);
  if (code === "23505" || code === "23503" || code === "40001" || code === "40P01") {
    return json(envelope("CONFLICT", "The request conflicts with the current state. Reload and try again."), 409);
  }
  // Unexpected: log server-side, never leak internals to the client.
  console.error("[api] unexpected error", error);
  return json(envelope("INTERNAL_ERROR", "Something went wrong."), 500);
}

const MAX_BODY_BYTES = 1_000_000;

// Parses and validates a JSON body. Malformed JSON is 400; a body that fails
// the schema is 422 with field-level issues.
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new DomainError("TOO_LARGE", "PAYLOAD_TOO_LARGE", "The request body is too large.");
  let body: unknown;
  try {
    body = text.trim() ? JSON.parse(text) : undefined;
  } catch {
    throw new DomainError("MALFORMED", "MALFORMED_REQUEST", "The request body is not valid JSON.");
  }
  return parseWith(schema, body);
}

export function readQuery<T>(request: Request, schema: ZodType<T>): T {
  return parseWith(schema, Object.fromEntries(new URL(request.url).searchParams));
}

function parseWith<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError(result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })));
  }
  return result.data;
}

export const paginationQuery = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

// ---- Path parameters ----

export const uuidParam = z.uuid();
export const slugParam = z.string().max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

type NextContext = { params: Promise<Record<string, string | string[]>> };

// A path parameter that cannot name anything is simply not found.
async function readParams<P>(schema: ZodType<P> | undefined, context: NextContext | undefined): Promise<P> {
  if (!schema) return {} as P;
  const result = schema.safeParse(await context?.params);
  if (!result.success) throw new DomainError("NOT_FOUND", "NOT_FOUND", "Not found.");
  return result.data;
}

const isMutation = (request: Request) => !["GET", "HEAD", "OPTIONS"].includes(request.method);

export type RouteInput<P> = { request: Request; params: P; db: Database };
export type AdminRouteInput<P> = RouteInput<P> & { admin: AdminPrincipal };

async function run(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    // Next.js's own control flow (redirects, dynamic rendering) passes through.
    unstable_rethrow(error);
    return errorResponse(error);
  }
}

function csrfCheck(request: Request) {
  if (isMutation(request) && !isSameOriginRequest(request)) {
    throw new DomainError("FORBIDDEN", "CSRF_REJECTED", "The request did not come from this site.");
  }
}

// A route anyone may call. Mutations still pass the CSRF check.
export function publicRoute<P = Record<string, never>>(
  handler: (input: RouteInput<P>) => Promise<Response>,
  options: { params?: ZodType<P> } = {},
) {
  return (request: Request, context?: NextContext) =>
    run(async () => {
      csrfCheck(request);
      const params = await readParams(options.params, context);
      return handler({ request, params, db: getDatabase() });
    });
}

// A route only an authenticated admin may call (CLAUDE.md §16: server-side
// authorisation for every admin mutation). The CSRF check runs first, before
// any work.
export function adminRoute<P = Record<string, never>>(
  handler: (input: AdminRouteInput<P>) => Promise<Response>,
  options: { params?: ZodType<P> } = {},
) {
  return (request: Request, context?: NextContext) =>
    run(async () => {
      csrfCheck(request);
      const params = await readParams(options.params, context);
      const db = getDatabase();
      const admin = await createAuthService(db).authenticate(readCookie(request, ADMIN_SESSION_COOKIE));
      if (!admin) throw new DomainError("UNAUTHENTICATED", "UNAUTHENTICATED", "Sign in to continue.");
      return handler({ request, params, db, admin });
    });
}
