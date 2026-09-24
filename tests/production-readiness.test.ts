import "./helpers/access-secret";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { checkHealth } from "@/features/operations/health.service";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { createProjectRouter } from "@/features/site-content/project-router";
import { staticGateway } from "@/features/site-content/static-gateway";
import { parseServerEnv, productionIssues } from "@/lib/env/server-env";
import { ownOrigins, resolveClientAddress } from "@/lib/http/request";
import { contentSecurityPolicy, mediaOriginsFromEnv, securityHeaders } from "@/lib/http/security-headers";
import {
  createLocalMediaStorage,
  createS3MediaStorage,
  mediaKeys,
  PrivateMediaKeyError,
  setMediaStorageForTesting,
  type MediaStorage,
} from "@/lib/storage/media-storage";
import { presignS3 } from "@/lib/storage/s3-presign";
import { assertDatabaseTarget } from "../scripts/lib/database-target";
import { buildMediaManifest } from "../scripts/lib/media-manifest";
import { probeMediaFile } from "../scripts/lib/media-probe";
import { buildImportPlan } from "../scripts/lib/static-import";
import { api, cookieFrom, createApiTestContext } from "./helpers/api";
import { createTestDatabase } from "./helpers/test-database";

type Context = Awaited<ReturnType<typeof createApiTestContext>>;

describe("environment contract (docs/operations/environment.md)", () => {
  test("new settings default safely and validate", () => {
    const env = parseServerEnv({});
    assert.equal(env.TRUSTED_PROXY_HOPS, 0);
    assert.equal(env.CLIENT_IP_HEADER, undefined);
    assert.equal(env.MEDIA_STORAGE_PROVIDER, "local");
    assert.equal(env.MEDIA_SIGNED_URL_TTL_SECONDS, 300);
    assert.equal(env.VIDEO_PROVIDER, "none");
    assert.equal(parseServerEnv({ CLIENT_IP_HEADER: "X-Real-IP" }).CLIENT_IP_HEADER, "x-real-ip");
    assert.throws(() => parseServerEnv({ SITE_URL: "https://example.com/" }), /bare origin/);
    assert.throws(() => parseServerEnv({ SITE_URL: "ftp://example.com" }));
    assert.throws(() => parseServerEnv({ TRUSTED_PROXY_HOPS: "9" }));
    assert.throws(() => parseServerEnv({ VIDEO_PROVIDER: "mux" }), /only "none"/);
    assert.throws(() => parseServerEnv({ MEDIA_SIGNED_URL_TTL_SECONDS: "5" }));
  });

  test("the s3 provider needs its endpoint, two distinct buckets and credentials", () => {
    assert.throws(() => parseServerEnv({ MEDIA_STORAGE_PROVIDER: "s3" }), /S3_ENDPOINT[\s\S]*S3_PUBLIC_BUCKET/);
    const s3 = {
      MEDIA_STORAGE_PROVIDER: "s3",
      S3_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
      S3_PUBLIC_BUCKET: "portfolio-public",
      S3_PRIVATE_BUCKET: "portfolio-public",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
    };
    assert.throws(() => parseServerEnv(s3), /must differ/);
    assert.equal(parseServerEnv({ ...s3, S3_PRIVATE_BUCKET: "portfolio-private" }).S3_REGION, "auto");
  });

  test("production readiness names everything a public deployment still lacks", () => {
    const local = productionIssues(parseServerEnv({}));
    assert.equal(local.length, 6);
    const ready = parseServerEnv({
      SITE_URL: "https://www.example.com",
      SITE_CONTENT_ADAPTER: "db",
      DATABASE_URL: "postgres://u@db.example.com/portfolio",
      PROJECT_ACCESS_SECRET: "x".repeat(40),
      CLIENT_IP_HEADER: "x-real-ip",
      MEDIA_STORAGE_PROVIDER: "s3",
      MEDIA_PUBLIC_BASE_URL: "https://media.example.com",
      S3_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
      S3_PUBLIC_BUCKET: "portfolio-public",
      S3_PRIVATE_BUCKET: "portfolio-private",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
    });
    assert.deepEqual(productionIssues(ready), []);
  });
});

describe("client address behind proxies (trusted-proxy policy)", () => {
  const headers = (values: Record<string, string>) => new Headers(values);

  test("a direct request, or one with forwarded headers but no trusted proxy, is 'unknown'", () => {
    assert.equal(resolveClientAddress(headers({}), { hops: 0 }), "unknown");
    // Spoofed: with no proxy configured the client wrote these itself.
    assert.equal(resolveClientAddress(headers({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" }), { hops: 0 }), "unknown");
  });

  test("behind N trusted proxies the N-th entry from the right is the client", () => {
    const chain = headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" });
    assert.equal(resolveClientAddress(chain, { hops: 1 }), "203.0.113.9");
    assert.equal(resolveClientAddress(headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.0.0.2" }), { hops: 2 }), "203.0.113.9");
    // A spoofed prefix cannot move the answer: only the proxies' entries count.
    assert.equal(resolveClientAddress(headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.9" }), { hops: 1 }), "203.0.113.9");
    // Fewer entries than proxies: misconfigured, so nothing is trusted.
    assert.equal(resolveClientAddress(headers({ "x-forwarded-for": "203.0.113.9" }), { hops: 2 }), "unknown");
  });

  test("a platform header is read only when configured, and must be an address", () => {
    assert.equal(resolveClientAddress(headers({ "x-real-ip": "198.51.100.7" }), { header: "x-real-ip", hops: 0 }), "198.51.100.7");
    assert.equal(resolveClientAddress(headers({ "x-real-ip": "[2001:DB8::1]:443" }), { header: "x-real-ip", hops: 0 }), "2001:db8::1");
    assert.equal(resolveClientAddress(headers({ "x-real-ip": "198.51.100.7:5000" }), { header: "x-real-ip", hops: 0 }), "198.51.100.7");
    assert.equal(resolveClientAddress(headers({ "x-real-ip": "not-an-ip" }), { header: "x-real-ip", hops: 0 }), "unknown");
    // The configured header wins over X-Forwarded-For.
    assert.equal(
      resolveClientAddress(headers({ "cf-connecting-ip": "192.0.2.1", "x-forwarded-for": "9.9.9.9" }), { header: "cf-connecting-ip", hops: 1 }),
      "192.0.2.1",
    );
  });

  test("forwarded host and protocol count for the CSRF origin only behind a trusted proxy", () => {
    const request = new Request("http://app.internal/api/v1/x", {
      headers: { host: "app.internal", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" },
    });
    assert.ok(!ownOrigins(request, { hops: 0 }).includes("https://evil.example"));
    assert.ok(ownOrigins(request, { hops: 1 }).includes("https://evil.example"));
  });
});

describe("security headers (CLAUDE.md §16)", () => {
  const media = ["https://media.example.com"];

  test("production CSP: no eval, framed only by itself, embeds limited to the video players", () => {
    const csp = contentSecurityPolicy({ production: true, siteUrl: "https://www.example.com", mediaOrigins: media });
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self' 'unsafe-inline'(;|$)/);
    assert.ok(!csp.includes("unsafe-eval"));
    assert.match(csp, /frame-ancestors 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-src 'self' https:\/\/www\.youtube-nocookie\.com https:\/\/www\.youtube\.com https:\/\/player\.vimeo\.com;/);
    assert.match(csp, /media-src 'self' blob: https:\/\/media\.example\.com/);
    assert.match(csp, /img-src 'self' data: blob: https:\/\/media\.example\.com/);
    assert.match(csp, /connect-src 'self' https:\/\/media\.example\.com/);
    assert.match(csp, /upgrade-insecure-requests/);
  });

  test("development keeps what Next.js needs; a local http production build is not upgraded", () => {
    const dev = contentSecurityPolicy({ production: false, mediaOrigins: [] });
    assert.match(dev, /'unsafe-eval'/);
    assert.match(dev, /connect-src 'self' ws:/);
    const local = contentSecurityPolicy({ production: true, siteUrl: "http://localhost:3000", mediaOrigins: [] });
    assert.ok(!local.includes("upgrade-insecure-requests"));
  });

  test("HSTS only for an https production origin; the other headers always", () => {
    const names = (list: { key: string }[]) => list.map((h) => h.key);
    const prod = securityHeaders({ production: true, siteUrl: "https://www.example.com", mediaOrigins: [] });
    assert.ok(names(prod).includes("Strict-Transport-Security"));
    for (const options of [
      { production: false, siteUrl: "https://www.example.com", mediaOrigins: [] },
      { production: true, siteUrl: "http://localhost:3000", mediaOrigins: [] },
      { production: true, mediaOrigins: [] },
    ]) {
      assert.ok(!names(securityHeaders(options)).includes("Strict-Transport-Security"));
    }
    const always = securityHeaders({ production: false, mediaOrigins: [] });
    const value = (key: string) => always.find((h) => h.key === key)?.value;
    assert.equal(value("X-Content-Type-Options"), "nosniff");
    assert.equal(value("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(value("X-Frame-Options"), "SAMEORIGIN");
    assert.match(value("Permissions-Policy")!, /camera=\(\), microphone=\(\), geolocation=\(\)/);
  });

  test("media origins come from the CDN base and the storage endpoint, never a relative path", () => {
    assert.deepEqual(mediaOriginsFromEnv({ MEDIA_PUBLIC_BASE_URL: "/media" }), []);
    assert.deepEqual(
      mediaOriginsFromEnv({
        MEDIA_PUBLIC_BASE_URL: "https://media.example.com/site",
        MEDIA_STORAGE_PROVIDER: "s3",
        S3_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
      }),
      ["https://media.example.com", "https://acct.r2.cloudflarestorage.com"],
    );
    assert.deepEqual(
      mediaOriginsFromEnv({
        MEDIA_STORAGE_PROVIDER: "s3",
        S3_ENDPOINT: "https://s3.eu-west-1.amazonaws.com",
        S3_FORCE_PATH_STYLE: "false",
        S3_PUBLIC_BUCKET: "pub",
        S3_PRIVATE_BUCKET: "priv",
      }),
      ["https://s3.eu-west-1.amazonaws.com", "https://pub.s3.eu-west-1.amazonaws.com", "https://priv.s3.eu-west-1.amazonaws.com"],
    );
  });
});

describe("private media storage (ADR-0014 §4)", () => {
  test("a private key is never publicly addressable, and lives outside public/", () => {
    const storage = createLocalMediaStorage("/media", { public: resolve("public/media"), private: resolve("storage/private") });
    assert.equal(storage.publicUrl("home/n1.mp4"), "/media/home/n1.mp4");
    assert.throws(() => storage.publicUrl("private/projects/x/cut.mp4"), PrivateMediaKeyError);
    assert.equal(storage.localPath("private/projects/x/cut.mp4"), join(resolve("storage/private"), "projects", "x", "cut.mp4"));
    assert.equal(storage.localPath("home/n1.mp4"), join(resolve("public/media"), "home", "n1.mp4"));
    assert.equal(storage.signedDeliveryUrl("private/a.mp4", 60), null);
    assert.throws(() => storage.localPath("private/../../etc/passwd"));
    assert.equal(mediaKeys.private("projects/x/cut.mp4"), "private/projects/x/cut.mp4");
    assert.equal(mediaKeys.private("private/a.mp4"), "private/a.mp4");
  });

  test("SigV4 presigning reproduces AWS's published example", () => {
    const url = presignS3({
      method: "GET",
      location: { endpoint: "https://s3.amazonaws.com", bucket: "examplebucket", key: "test.txt", region: "us-east-1", pathStyle: false },
      credentials: { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
      expiresInSeconds: 86400,
      now: new Date("2013-05-24T00:00:00Z"),
    });
    assert.ok(url.startsWith("https://examplebucket.s3.amazonaws.com/test.txt?"));
    assert.ok(url.endsWith("X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"));
  });

  test("the s3 adapter signs private keys against the private bucket, with an expiry", async () => {
    const storage = createS3MediaStorage({
      endpoint: "https://acct.r2.cloudflarestorage.com",
      region: "auto",
      publicBucket: "pub",
      privateBucket: "priv",
      accessKeyId: "id",
      secretAccessKey: "secret",
      pathStyle: true,
      publicBaseUrl: "https://media.example.com",
      uploadTtlSeconds: 600,
    });
    assert.equal(storage.publicUrl("works/a.jpg"), "https://media.example.com/works/a.jpg");
    assert.throws(() => storage.publicUrl("private/a.mp4"), PrivateMediaKeyError);
    const signed = storage.signedDeliveryUrl("private/projects/x/cut.mp4", 120)!;
    assert.match(signed, /^https:\/\/acct\.r2\.cloudflarestorage\.com\/priv\/private\/projects\/x\/cut\.mp4\?/);
    assert.match(signed, /X-Amz-Expires=120&/);
    assert.equal(storage.localPath("private/a.mp4"), null);
    const upload = await storage.createUpload({ key: "originals/m1/a.jpg", mimeType: "image/jpeg", byteSize: 10 });
    assert.equal(upload.method, "PUT");
    assert.match(upload.url, /\/pub\/originals\/m1\/a\.jpg\?.*X-Amz-Expires=600/);
    assert.deepEqual(upload.headers, { "content-type": "image/jpeg" });
  });
});

describe("private delivery, private metadata and routing (2G-A)", () => {
  let ctx: Context;
  let stillId: string;
  let access: string;
  before(async () => {
    ctx = await createApiTestContext();
    const [cover] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/mtm-sketch.jpg'");
    const [still] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/desk-05.jpg'");
    stillId = still.id;
    const id = (
      await ctx.as("POST", "/projects", {
        title: "Client Cut",
        slug: "client-cut",
        year: 2026,
        visibility: "PRIVATE",
        password: "open sesame 2026",
        coverMediaId: cover.id,
      })
    ).body.data.id;
    const grid = (await ctx.as("POST", `/projects/${id}/blocks`, { type: "GRID", config: { preset: "projectMeta" } })).body.data;
    await ctx.as("POST", `/projects/${id}/blocks`, { type: "TEXT", parentBlockId: grid.id, content: { kind: "projectFacts" } });
    const coda = (await ctx.as("POST", `/projects/${id}/blocks`, { type: "IMAGE", config: { preset: "projectCoda" } })).body.data;
    await ctx.as("POST", `/blocks/${coda.id}/media`, { mediaId: stillId });
    assert.equal((await ctx.as("POST", `/projects/${id}/publish`)).status, 200);
    const unlocked = await api("POST", "/public/projects/client-cut/access", {
      body: { password: "open sesame 2026" },
      headers: { "x-forwarded-for": "10.7.0.1" },
    });
    access = cookieFrom(unlocked);
  });
  after(async () => {
    setMediaStorageForTesting(undefined);
    await ctx.close();
  });

  test("with a signing provider, verified access is redirected to a short-lived signed URL", async () => {
    const signed: MediaStorage = {
      ...createLocalMediaStorage("/media"),
      provider: "local",
      signedDeliveryUrl: (key, ttl) => `https://private.example.com/${key}?expires=${ttl}`,
    };
    setMediaStorageForTesting(signed);
    const redirected = await api("GET", `/public/projects/client-cut/media/${stillId}`, { cookie: access });
    assert.equal(redirected.status, 302);
    assert.match(redirected.headers.get("location")!, /^https:\/\/private\.example\.com\/.*\?expires=300$/);
    assert.equal(redirected.headers.get("cache-control"), "private, no-store");
    // Without access nothing is revealed, signed or not.
    assert.equal((await api("GET", `/public/projects/client-cut/media/${stillId}`)).status, 404);
    setMediaStorageForTesting(undefined);
  });

  test("a project published a moment ago is routable at once, whatever the index holds", async () => {
    const gateway = createDbGateway(ctx.database.db);
    let lookups = 0;
    const router = createProjectRouter({
      listProjectRoutes: () => gateway.listProjectRoutes(),
      findProjectRoute: (slug) => {
        lookups += 1;
        return gateway.findProjectRoute(slug);
      },
    });
    assert.equal(await router.route("made-to-measure"), "public");
    assert.equal(await router.route("client-cut"), "private");
    assert.equal(await router.route("fresh-cut"), "unknown");

    // Published after the index was read: no wait, no sleep.
    const [cover] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/mtm-sketch.jpg'");
    const id = (await ctx.as("POST", "/projects", { title: "Fresh Cut", slug: "fresh-cut", year: 2026, coverMediaId: cover.id })).body.data.id;
    const grid = (await ctx.as("POST", `/projects/${id}/blocks`, { type: "GRID", config: { preset: "projectMeta" } })).body.data;
    await ctx.as("POST", `/projects/${id}/blocks`, { type: "TEXT", parentBlockId: grid.id, content: { kind: "projectFacts" } });
    assert.equal((await ctx.as("POST", `/projects/${id}/publish`)).status, 200);
    assert.equal(await router.route("fresh-cut"), "public");
    assert.ok(await gateway.getProjectPage("fresh-cut"));

    // Malformed addresses never reach the database.
    const before = lookups;
    assert.equal(await router.route("Fresh-Cut"), "unknown");
    assert.equal(await router.route("../admin"), "unknown");
    assert.equal(await router.route("x".repeat(201)), "unknown");
    assert.equal(lookups, before);
  });

  test("the static adapter routes its committed projects the same way", async () => {
    const router = createProjectRouter(staticGateway);
    assert.equal(await router.route("made-to-measure"), "public");
    assert.equal(await router.route("nope"), "unknown");
  });
});

describe("health and database targets (docs/operations/runbook.md)", () => {
  test("a migrated database is healthy; a missing migration is reported, not hidden", async () => {
    const database = await createTestDatabase();
    try {
      const ok = await checkHealth({ db: database.db, databaseRequired: true, storageConfigured: true });
      assert.deepEqual(ok, { status: "ok", checks: { database: "ok", schema: "ok", storage: "ok" } });
      await database.client.query("delete from drizzle.__drizzle_migrations where id = (select max(id) from drizzle.__drizzle_migrations)");
      const behind = await checkHealth({ db: database.db, databaseRequired: true, storageConfigured: true });
      assert.equal(behind.status, "unavailable");
      assert.equal(behind.checks.schema, "behind");
      await database.client.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ('x', 1)");
      assert.equal((await checkHealth({ db: database.db, databaseRequired: true, storageConfigured: true })).checks.schema, "ahead");
    } finally {
      await database.close();
    }
  });

  test("without a database: static mode is fine, database mode is unavailable", async () => {
    assert.equal((await checkHealth({ db: null, databaseRequired: false, storageConfigured: true })).status, "ok");
    assert.equal((await checkHealth({ db: null, databaseRequired: true, storageConfigured: true })).status, "unavailable");
    assert.equal((await checkHealth({ db: null, databaseRequired: false, storageConfigured: false })).status, "degraded");
  });

  test("a remote database needs the exact target confirmed on the command line", () => {
    assert.equal(assertDatabaseTarget("postgres://u@localhost:5432/dev", []).remote, false);
    assert.equal(assertDatabaseTarget("postgres://u@127.0.0.1/dev", []).remote, false);
    const url = "postgres://u:p@ep-cool-name.eu-central-1.aws.neon.tech/portfolio?sslmode=require";
    assert.throws(() => assertDatabaseTarget(url, []), /--confirm-remote=ep-cool-name\.eu-central-1\.aws\.neon\.tech\/portfolio/);
    assert.throws(() => assertDatabaseTarget(url, ["--confirm-remote=ep-cool-name.eu-central-1.aws.neon.tech/other"]));
    assert.throws(() => assertDatabaseTarget(url, ["--confirm-remote"]));
    const target = assertDatabaseTarget(url, ["--confirm-remote=ep-cool-name.eu-central-1.aws.neon.tech/portfolio"]);
    assert.equal(target.remote, true);
  });
});

describe("production media manifest (dry run)", () => {
  let ctx: Context;
  before(async () => {
    ctx = await createApiTestContext();
  });
  after(async () => {
    await ctx.close();
  });

  const build = async () => {
    const storage = createLocalMediaStorage("/media", { public: resolve("public/media"), private: resolve("storage/private") });
    const plan = await buildImportPlan(staticGateway, resolve("public/media"));
    return buildMediaManifest({
      db: ctx.database.db,
      staticPlacements: plan.inventory.placements,
      pathFor: (provider, key) => (provider === "local" || provider === null ? storage.localPath(key) : null),
      probe: probeMediaFile,
    });
  };

  test("classifies by relational use, keeps public keys, and moves private-only media under private/", async () => {
    // A still only a PRIVATE project uses becomes private; one also used
    // publicly stays public.
    const [only] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/desk-05.jpg'");
    const [shared] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/mtm-sketch.jpg'");
    await ctx.q("delete from block_media where media_id = '" + only.id + "'");
    await ctx.q("delete from publication_media where media_id = '" + only.id + "'");
    const id = (
      await ctx.as("POST", "/projects", {
        title: "Client Cut",
        slug: "client-cut",
        year: 2026,
        visibility: "PRIVATE",
        password: "open sesame 2026",
        coverMediaId: shared.id,
      })
    ).body.data.id;
    const coda = (await ctx.as("POST", `/projects/${id}/blocks`, { type: "IMAGE", config: { preset: "projectCoda" } })).body.data;
    assert.equal((await ctx.as("POST", `/blocks/${coda.id}/media`, { mediaId: only.id })).status, 201);

    const manifest = await build();
    const entry = (mediaId: string) => manifest.entries.find((e) => e.id === mediaId)!;
    assert.equal(entry(only.id).audience, "private");
    assert.equal(entry(only.id).target?.bucket, "private");
    assert.match(entry(only.id).target!.key, /^private\//);
    assert.equal(entry(shared.id).audience, "public");
    assert.equal(entry(shared.id).target?.key, entry(shared.id).source.key);
    assert.ok(entry(shared.id).usages.some((u) => u.owner === "project:client-cut" && u.audience === "private"));
    // Posters inherit the audience of the video they stand for.
    const video = manifest.entries.find((e) => e.type === "VIDEO" && e.posters.defaultPosterId)!;
    assert.equal(entry(video.posters.defaultPosterId!).audience, video.audience);
    // About and Contact keep their own static files, which production needs.
    assert.ok(manifest.entries.some((e) => e.origin === "static-content" && e.deploy && e.source.key?.startsWith("about/")));
    assert.equal(manifest.summary.missingFiles, 0);
    assert.equal(manifest.summary.collisions, 0);
  });

  test("is deterministic, and reports missing files and case-insensitive collisions", async () => {
    assert.deepEqual(await build(), await build());
    const [asset] = await ctx.q<{ id: string; storage_key: string }>(
      "select m.id, m.storage_key from media m join projects p on p.cover_media_id = m.id where p.visibility = 'PUBLIC' order by m.id limit 1",
    );
    const [other] = await ctx.q<{ id: string; storage_key: string }>(
      `select m.id, m.storage_key from media m join projects p on p.cover_media_id = m.id where p.visibility = 'PUBLIC' and m.id <> '${asset.id}' order by m.id limit 1`,
    );
    try {
      await ctx.q(`update media set storage_key = 'projects/gone/missing.jpg' where id = '${asset.id}'`);
      assert.ok((await build()).missing.some((line) => line.startsWith(asset.id)));
      // Differs only by case: one object on a case-insensitive store.
      await ctx.q(`update media set storage_key = '${other.storage_key.toUpperCase()}' where id = '${asset.id}'`);
      const manifest = await build();
      assert.ok(manifest.collisions.some((c) => c.entries.includes(asset.id) && c.entries.includes(other.id)));
    } finally {
      await ctx.q(`update media set storage_key = '${asset.storage_key}' where id = '${asset.id}'`);
    }
  });
});

describe("robots and sitemap", () => {
  test("the sitemap lists the public pages and public projects only; robots keep crawlers out of the Studio", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const { default: robots } = await import("@/app/robots");
    const urls = (await sitemap()).map((entry) => entry.url);
    assert.ok(urls.includes("http://localhost:3000/works/made-to-measure"));
    assert.ok(urls.includes("http://localhost:3000/about"));
    assert.ok(!urls.some((url) => /admin|api|client-cut/.test(url)));
    const rules = robots();
    assert.deepEqual(rules.rules, [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }]);
    assert.equal(rules.sitemap, "http://localhost:3000/sitemap.xml");
  });
});

describe("revalidation targets", () => {
  test("every dynamic route revalidated after a publish names a real route file, route group included", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const source = readFileSync("src/lib/cache/revalidate.ts", "utf8");
    const patterns = [...source.matchAll(/revalidatePath\("([^"]+)", "page"\)/g)].map((m) => m[1]);
    assert.ok(patterns.length > 0);
    for (const pattern of patterns) assert.ok(existsSync(`src/app${pattern}/page.tsx`), pattern);
    // Never the whole tree: that would also invalidate the prerendered 404.
    assert.ok(!/revalidatePath\("\/", "layout"\)/.test(source));
  });
});
