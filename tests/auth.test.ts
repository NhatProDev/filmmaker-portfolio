import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { after, before, describe, test } from "node:test";
import { load } from "js-yaml";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sign, verifySigned } from "@/lib/auth/tokens";
import { ADMIN, api, cookieFrom, createApiTestContext, resolveRoute } from "./helpers/api";

type Context = Awaited<ReturnType<typeof createApiTestContext>>;

describe("password hashing (CLAUDE.md §16)", () => {
  test("Argon2id in PHC format, salted, verified in constant time", async () => {
    const a = await hashPassword("a long enough password");
    const b = await hashPassword("a long enough password");
    assert.match(a, /^\$argon2id\$v=19\$m=65536,t=3,p=4\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
    assert.notEqual(a, b);
    assert.equal(await verifyPassword("a long enough password", a), true);
    assert.equal(await verifyPassword("a long enough passworD", a), false);
    assert.equal(await verifyPassword("anything", "plaintext"), false);
  });

  test("signed values reject any tampering", () => {
    const secret = "s".repeat(32);
    const value = sign(secret, "payload-1");
    assert.equal(verifySigned(secret, value), "payload-1");
    assert.equal(verifySigned(secret, value.replace("payload-1", "payload-2")), null);
    assert.equal(verifySigned("t".repeat(32), value), null);
    assert.equal(verifySigned(secret, "garbage"), null);
  });
});

describe("admin authentication (CLAUDE.md §11, §16, §17.5)", () => {
  let ctx: Context;
  before(async () => {
    ctx = await createApiTestContext({ importContent: false });
  });
  after(() => ctx.close());

  test("a session cookie is HttpOnly, SameSite=Strict and never carries the password hash", async () => {
    const response = await api("POST", "/auth/login", { body: ADMIN, headers: { "x-forwarded-for": "10.1.0.1" } });
    assert.equal(response.status, 200);
    const setCookie = response.headers.get("set-cookie")!;
    assert.match(setCookie, /^portfolio_admin_session=[A-Za-z0-9_-]{43};/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    assert.match(setCookie, /Path=\//);
    assert.equal(response.body.data.email, ADMIN.email);
    assert.ok(!JSON.stringify(response.body).match(/argon2|passwordHash/i));
    // Only a hash of the token is stored.
    const token = cookieFrom(response).split("=")[1];
    const stored = await ctx.q<{ token_hash: string }>("select token_hash from admin_sessions");
    assert.ok(stored.every((row) => row.token_hash !== token && /^[0-9a-f]{64}$/.test(row.token_hash)));
  });

  test("a wrong password and an unknown email fail the same way", async () => {
    const wrong = await api("POST", "/auth/login", {
      body: { ...ADMIN, password: "not the password" },
      headers: { "x-forwarded-for": "10.1.0.2" },
    });
    const unknown = await api("POST", "/auth/login", {
      body: { email: "nobody@studio.test", password: "whatever it is" },
      headers: { "x-forwarded-for": "10.1.0.2" },
    });
    for (const response of [wrong, unknown]) {
      assert.equal(response.status, 401);
      assert.equal(response.body.error.code, "INVALID_CREDENTIALS");
      assert.equal(response.headers.get("set-cookie"), null);
    }
  });

  test("the email is matched case-insensitively", async () => {
    const response = await api("POST", "/auth/login", {
      body: { ...ADMIN, email: ADMIN.email.toUpperCase() },
      headers: { "x-forwarded-for": "10.1.0.3" },
    });
    assert.equal(response.status, 200);
  });

  test("/auth/me needs a live session; logout revokes it server-side", async () => {
    const login = await api("POST", "/auth/login", { body: ADMIN, headers: { "x-forwarded-for": "10.1.0.4" } });
    const cookie = cookieFrom(login);
    assert.equal((await api("GET", "/auth/me", { cookie })).status, 200);
    assert.equal((await api("GET", "/auth/me")).status, 401);
    assert.equal((await api("GET", "/auth/me", { cookie: "portfolio_admin_session=forged" })).status, 401);
    const logout = await api("POST", "/auth/logout", { cookie });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get("set-cookie")!, /Max-Age=0/);
    // The old cookie is dead even if the browser kept it.
    assert.equal((await api("GET", "/auth/me", { cookie })).status, 401);
  });

  test("an expired session no longer authenticates", async () => {
    const login = await api("POST", "/auth/login", { body: ADMIN, headers: { "x-forwarded-for": "10.1.0.5" } });
    const cookie = cookieFrom(login);
    await ctx.q("update admin_sessions set expires_at = now() - interval '1 second'");
    assert.equal((await api("GET", "/auth/me", { cookie })).status, 401);
  });

  test("login attempts are rate-limited per client address", async () => {
    const attempt = () =>
      api("POST", "/auth/login", {
        body: { ...ADMIN, password: "wrong wrong wrong" },
        headers: { "x-forwarded-for": "10.9.9.9" },
      });
    for (let i = 0; i < 10; i++) assert.equal((await attempt()).status, 401);
    const limited = await attempt();
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, "RATE_LIMITED");
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    // Even the right password is refused while limited: no oracle.
    const right = await api("POST", "/auth/login", { body: ADMIN, headers: { "x-forwarded-for": "10.9.9.9" } });
    assert.equal(right.status, 429);
  });

  test("provisioning again replaces the password and revokes every session", async () => {
    const { createAuthService } = await import("@/features/authentication/auth.service");
    const login = await api("POST", "/auth/login", { body: ADMIN, headers: { "x-forwarded-for": "10.1.0.6" } });
    const cookie = cookieFrom(login);
    await createAuthService(ctx.database.db).provisionAdmin({ ...ADMIN, name: null });
    assert.equal((await api("GET", "/auth/me", { cookie })).status, 401);
    await assert.rejects(
      createAuthService(ctx.database.db).provisionAdmin({ email: "x@studio.test", password: "short", name: null }),
    );
  });
});

describe("CSRF and authorisation on every admin operation (CLAUDE.md §16, §17.5)", () => {
  let ctx: Context;
  before(async () => {
    ctx = await createApiTestContext({ importContent: false });
  });
  after(() => ctx.close());

  test("a mutation without this site's Origin is refused before any work", async () => {
    const body = { title: "X", slug: "csrf-probe" };
    for (const origin of [null, "https://evil.example", "http://studio.test.evil.example"]) {
      const response = await api("POST", "/projects", { body, cookie: ctx.cookie, origin });
      assert.equal(response.status, 403, String(origin));
      assert.equal(response.body.error.code, "CSRF_REJECTED");
    }
    // A same-origin fetch without an Origin header still identifies itself.
    const sameSite = await api("POST", "/projects", {
      body,
      cookie: ctx.cookie,
      origin: null,
      headers: { "sec-fetch-site": "same-origin" },
    });
    assert.equal(sameSite.status, 201);
    assert.equal((await ctx.q("select count(*)::int as n from projects"))[0].n, 1);
  });

  test("every admin operation in the contract has a handler, and refuses an anonymous caller", async () => {
    const contract = load(readFileSync("openapi.yaml", "utf8")) as {
      paths: Record<string, Record<string, { security?: unknown[] }>>;
    };
    const uuid = "00000000-0000-4000-8000-000000000000";
    // Operations that arrive with publishing and private access (Phase 2E).
    const pending = new Set([
      "POST /projects/{projectId}/publish",
      "POST /projects/{projectId}/unpublish",
      "POST /projects/{projectId}/archive",
      "GET /projects/{projectId}/preview",
      "GET /preview/exit",
      "POST /pages/{pageKey}/publish",
      "GET /pages/{pageKey}/preview",
      "GET /public/projects",
      "GET /public/projects/{slug}",
      "POST /public/projects/{slug}/access",
      "GET /public/projects/{slug}/media/{mediaId}",
    ]);
    let checked = 0;
    for (const [template, item] of Object.entries(contract.paths)) {
      for (const [method, operation] of Object.entries(item)) {
        if (method === "parameters") continue;
        if (pending.has(`${method.toUpperCase()} ${template}`)) {
          assert.equal(resolveRoute(template.replace(/\{\w+\}/g, uuid)), null, `${template} is implemented; unlist it`);
          continue;
        }
        const path = template.replace(/\{pageKey\}/g, "HOME").replace(/\{slug\}/g, "some-slug").replace(/\{\w+\}/g, uuid);
        const route = resolveRoute(path);
        assert.ok(route, `no route module for ${method.toUpperCase()} ${template}`);
        const handlers = await import(pathToFileURL(route.file).href);
        assert.equal(typeof handlers[method.toUpperCase()], "function", `${method.toUpperCase()} ${template} is not exported`);
        const isAdmin = JSON.stringify(operation.security ?? []).includes("adminSession");
        if (!isAdmin || template === "/auth/logout") continue;
        const verb = method.toUpperCase();
        const response = await api(verb, path, verb === "GET" ? {} : { body: {} });
        assert.equal(response.status, 401, `${method.toUpperCase()} ${template} → ${response.status}`);
        checked += 1;
      }
    }
    assert.ok(checked >= 30, `only ${checked} admin operations checked`);
  });
});
