import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setDatabaseForTesting } from "@db/client";
import { setPublicChangeHandlerForTesting } from "@/app/api/v1/_lib/services";
import { createAuthService } from "@/features/authentication/auth.service";
import { staticGateway } from "@/features/site-content/static-gateway";
import { applyImportPlan, buildImportPlan } from "../../scripts/lib/static-import";
import { createTestDatabase } from "./test-database";

// Calls /api/v1 route handlers in-process, resolving a path to its route module
// the way Next's router does (static segments before dynamic ones), against a
// disposable PGlite database.

const API_ROOT = resolve("src/app/api/v1");
export const ORIGIN = "http://studio.test";
export const ADMIN = { email: "admin@studio.test", password: "correct horse battery staple" };

export function resolveRoute(path: string): { file: string; params: Record<string, string> } | null {
  const segments = path.split("?")[0].split("/").filter(Boolean);
  const walk = (dir: string, i: number, params: Record<string, string>): { file: string; params: Record<string, string> } | null => {
    if (i === segments.length) {
      const file = join(dir, "route.ts");
      return existsSync(file) ? { file, params } : null;
    }
    const entries = readdirSync(dir).filter((e) => !e.startsWith("_") && statSync(join(dir, e)).isDirectory());
    if (entries.includes(segments[i])) {
      const found = walk(join(dir, segments[i]), i + 1, params);
      if (found) return found;
    }
    for (const entry of entries) {
      const dynamic = /^\[(\w+)\]$/.exec(entry);
      if (!dynamic) continue;
      const found = walk(join(dir, entry), i + 1, { ...params, [dynamic[1]]: decodeURIComponent(segments[i]) });
      if (found) return found;
    }
    return null;
  };
  return walk(API_ROOT, 0, {});
}

export type ApiResponse = { status: number; headers: Headers; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function api(
  method: string,
  path: string,
  options: {
    body?: unknown;
    cookie?: string;
    origin?: string | null;
    headers?: Record<string, string>;
    // Binary responses: the body is returned as its byte length.
    raw?: boolean;
  } = {},
): Promise<ApiResponse> {
  const route = resolveRoute(path);
  if (!route) throw new Error(`No route for ${path}`);
  const handlers = await import(pathToFileURL(route.file).href);
  const handler = handlers[method];
  if (!handler) return { status: 405, headers: new Headers(), body: null };
  const headers: Record<string, string> = { host: new URL(ORIGIN).host, ...options.headers };
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.cookie) headers.cookie = options.cookie;
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }
  const response: Response = await handler(new Request(`${ORIGIN}/api/v1${path}`, { method, headers, body }), {
    params: Promise.resolve(route.params),
  });
  if (options.raw) return { status: response.status, headers: response.headers, body: (await response.arrayBuffer()).byteLength };
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
}

// The cookie pair a Set-Cookie header grants, ready for a Cookie header.
export const cookieFrom = (response: ApiResponse) => response.headers.get("set-cookie")?.split(";")[0] ?? "";

// A migrated database with the committed static content imported and one
// admin, wired in as the application's database.
export async function createApiTestContext(options: { importContent?: boolean } = {}) {
  const database = await createTestDatabase();
  if (options.importContent !== false) {
    const plan = await buildImportPlan(staticGateway, resolve("public/media"));
    await applyImportPlan(database.db, plan, true);
  }
  await createAuthService(database.db).provisionAdmin({ ...ADMIN, name: "Test Admin" });
  setDatabaseForTesting(database.db);
  // No page cache outside Next.js; tests that count revalidations replace this.
  setPublicChangeHandlerForTesting(() => {});
  const login = await api("POST", "/auth/login", { body: ADMIN, headers: { "x-forwarded-for": "10.0.0.1" } });
  if (login.status !== 200) throw new Error(`login failed: ${JSON.stringify(login.body)}`);
  const cookie = cookieFrom(login);
  const q = async <T = Record<string, unknown>>(sql: string) => (await database.client.query<T>(sql)).rows;
  return {
    database,
    cookie,
    q,
    as: (method: string, path: string, body?: unknown) => api(method, path, { body, cookie }),
    close: async () => {
      setDatabaseForTesting(null);
      setPublicChangeHandlerForTesting(null);
      await database.close();
    },
  };
}
