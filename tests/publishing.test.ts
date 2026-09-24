import "./helpers/access-secret";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { setPublicChangeHandlerForTesting } from "@/app/api/v1/_lib/services";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { sha256Hex, sign } from "@/lib/auth/tokens";
import { api, cookieFrom, createApiTestContext } from "./helpers/api";

type Context = Awaited<ReturnType<typeof createApiTestContext>>;

describe("publishing: one current snapshot, public reads only it (ADR-0012)", () => {
  let ctx: Context;
  let revalidations = 0;
  let projectId: string;
  before(async () => {
    ctx = await createApiTestContext();
    setPublicChangeHandlerForTesting(() => (revalidations += 1));
    projectId = (await ctx.as("POST", "/projects", { title: "Rehearsal", slug: "rehearsal" })).body.data.id;
  });
  after(async () => {
    setPublicChangeHandlerForTesting(null);
    await ctx.close();
  });

  const listed = async () =>
    (await api("GET", "/public/projects?pageSize=100")).body.data.map((p: { slug: string }) => p.slug) as string[];

  test("publish is refused, with reasons, until the templates can render the project (§17.8)", async () => {
    const refused = await ctx.as("POST", `/projects/${projectId}/publish`);
    assert.equal(refused.status, 422);
    assert.equal(refused.body.error.code, "PROJECT_NOT_PUBLISHABLE");
    assert.match(JSON.stringify(refused.body.error.details.issues), /year|cover/);
    const detail = await ctx.as("GET", `/projects/${projectId}`);
    assert.equal(detail.body.data.publication.isPublished, false);
    assert.ok(detail.body.data.publication.issues.length > 0);
    assert.equal((await ctx.q(`select count(*)::int as n from project_publications where project_id = '${projectId}'`))[0].n, 0);
    assert.equal(revalidations, 0);
  });

  test("a publishable project goes live at the end of Art Works", async () => {
    const [cover] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/mtm-sketch.jpg'");
    await ctx.as("PATCH", `/projects/${projectId}`, { coverMediaId: cover.id, year: 2026 });
    const published = await ctx.as("POST", `/projects/${projectId}/publish`);
    assert.equal(published.status, 200);
    assert.equal(published.body.data.status, "PUBLISHED");
    assert.equal(published.body.data.publication.isPublished, true);
    assert.equal(published.body.data.publication.hasUnpublishedChanges, false);
    assert.deepEqual(published.body.data.publication.issues, []);
    assert.equal(revalidations, 1);
    const slugs = await listed();
    assert.equal(slugs.at(-1), "rehearsal");
    const works = await createDbGateway(ctx.database.db).getWorksIndex();
    assert.equal(works.projects.at(-1)?.title, "Rehearsal");
  });

  test("edits stay in the working copy until they are published", async () => {
    await ctx.as("PATCH", `/projects/${projectId}`, { title: "Rehearsal, final" });
    const detail = await ctx.as("GET", `/projects/${projectId}`);
    assert.equal(detail.body.data.publication.hasUnpublishedChanges, true);
    const gateway = createDbGateway(ctx.database.db);
    assert.equal((await gateway.getProjectPage("rehearsal"))?.title, "Rehearsal");
    assert.equal((await gateway.previewProjectPage("rehearsal")).value?.title, "Rehearsal, final");
    assert.equal((await api("GET", "/public/projects/rehearsal")).body.data.title, "Rehearsal");
    await ctx.as("POST", `/projects/${projectId}/publish`);
    assert.equal((await gateway.getProjectPage("rehearsal"))?.title, "Rehearsal, final");
    assert.equal((await ctx.q("select count(*)::int as n from project_publications"))[0].n, 10);
  });

  test("media referenced only by the live snapshot stays in use (ADR-0012 constraint 3)", async () => {
    const [still] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/mtm-portrait.jpg'");
    const grid = (await ctx.as("POST", `/projects/${projectId}/blocks`, { type: "GRID", config: { preset: "projectMeta" } })).body.data;
    await ctx.as("POST", `/projects/${projectId}/blocks`, { type: "TEXT", parentBlockId: grid.id, content: { kind: "projectFacts" } });
    const coda = (await ctx.as("POST", `/projects/${projectId}/blocks`, { type: "IMAGE", config: { preset: "projectCoda" } })).body.data;
    await ctx.as("POST", `/blocks/${coda.id}/media`, { mediaId: still.id });
    assert.equal((await ctx.as("POST", `/projects/${projectId}/publish`)).status, 200);
    await ctx.as("DELETE", `/blocks/${coda.id}`);
    const usages = (await ctx.as("GET", `/media/${still.id}/usages`)).body.data;
    assert.ok(usages.some((u: { kind: string; projectId: string }) => u.kind === "PUBLISHED_PROJECT" && u.projectId === projectId));
    assert.ok((await createDbGateway(ctx.database.db).getProjectPage("rehearsal"))?.blocks.some((b) => b.type === "projectCoda"));
  });

  test("unpublish removes the snapshot; archive and delete do too", async () => {
    const unpublished = await ctx.as("POST", `/projects/${projectId}/unpublish`);
    assert.equal(unpublished.status, 200);
    assert.equal(unpublished.body.data.status, "DRAFT");
    assert.ok(!(await listed()).includes("rehearsal"));
    assert.equal((await api("GET", "/public/projects/rehearsal")).status, 404);
    assert.equal((await ctx.as("POST", `/projects/${projectId}/unpublish`)).status, 409);
    await ctx.as("POST", `/projects/${projectId}/publish`);
    assert.equal((await ctx.as("POST", `/projects/${projectId}/archive`)).body.data.status, "ARCHIVED");
    assert.ok(!(await listed()).includes("rehearsal"));
    await ctx.as("POST", `/projects/${projectId}/publish`);
    const before = revalidations;
    assert.equal((await ctx.as("DELETE", `/projects/${projectId}`)).status, 204);
    assert.equal((await ctx.q(`select count(*)::int as n from project_publications where project_id = '${projectId}'`))[0].n, 0);
    assert.ok(revalidations > before);
  });

  test("reordering, and live slug or visibility changes, revalidate the public pages", async () => {
    const ids = (await ctx.q<{ id: string }>("select id from projects where deleted_at is null order by display_position")).map((r) => r.id);
    const before = revalidations;
    await ctx.as("PUT", "/projects/order", { projectIds: [...ids].reverse() });
    assert.equal(revalidations, before + 1);
    await ctx.as("PATCH", `/projects/${ids[0]}`, { runtime: "9 min" });
    assert.equal(revalidations, before + 1, "a content edit waits for publish");
    await ctx.as("PATCH", `/projects/${ids[0]}`, { slug: "renamed" });
    assert.equal(revalidations, before + 2);
    await ctx.as("PATCH", `/projects/${ids[0]}`, { slug: "made-to-measure" });
    await ctx.as("PUT", "/projects/order", { projectIds: ids });
  });

  test("Home publishes the same way, and is refused when it no longer fits its template", async () => {
    const published = await ctx.as("POST", "/pages/HOME/publish");
    assert.equal(published.status, 200);
    assert.equal(published.body.data.publication.isPublished, true);
    const [spacerFree] = await ctx.q<{ id: string }>("select id from pages where key = 'HOME'");
    const spacer = await ctx.as("POST", "/pages/HOME/blocks", { type: "SPACER", config: { size: "M" } });
    const refused = await ctx.as("POST", "/pages/HOME/publish");
    assert.equal(refused.status, 422);
    assert.equal(refused.body.error.code, "PAGE_NOT_PUBLISHABLE");
    assert.equal((await ctx.as("GET", "/pages/HOME")).body.data.publication.hasUnpublishedChanges, true);
    await ctx.as("DELETE", `/blocks/${spacer.body.data.id}`);
    assert.ok(spacerFree.id);
  });

  test("preview needs an admin session and a live project", async () => {
    assert.equal((await api("GET", `/projects/${projectId}/preview`)).status, 401);
    assert.equal((await ctx.as("GET", "/projects/00000000-0000-4000-8000-000000000000/preview")).status, 404);
    assert.equal((await api("GET", "/pages/HOME/preview")).status, 401);
  });
});

describe("private projects (CLAUDE.md §11, ADR-0003; §17.1–3)", () => {
  let ctx: Context;
  let id: string;
  let secretStill: string;
  before(async () => {
    ctx = await createApiTestContext();
    setPublicChangeHandlerForTesting(() => {});
    const [cover] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/mtm-sketch.jpg'");
    const [still] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/desk-05.jpg'");
    secretStill = still.id;
    const created = await ctx.as("POST", "/projects", {
      title: "Client Cut",
      slug: "client-cut",
      year: 2026,
      shortDescription: "Confidential",
      visibility: "PRIVATE",
      password: "open sesame 2026",
      coverMediaId: cover.id,
    });
    id = created.body.data.id;
    const grid = (await ctx.as("POST", `/projects/${id}/blocks`, { type: "GRID", config: { preset: "projectMeta" } })).body.data;
    await ctx.as("POST", `/projects/${id}/blocks`, { type: "TEXT", parentBlockId: grid.id, content: { kind: "projectFacts" } });
    const coda = (await ctx.as("POST", `/projects/${id}/blocks`, { type: "IMAGE", config: { preset: "projectCoda" } })).body.data;
    await ctx.as("POST", `/blocks/${coda.id}/media`, { mediaId: still.id });
    assert.equal((await ctx.as("POST", `/projects/${id}/publish`)).status, 200);
  });
  after(async () => {
    setPublicChangeHandlerForTesting(null);
    await ctx.close();
  });

  const unlock = (password: string, address = "10.2.0.1") =>
    api("POST", "/public/projects/client-cut/access", { body: { password }, headers: { "x-forwarded-for": address } });

  test("a PRIVATE project is never listed, in any form (§17.1)", async () => {
    const list = await api("GET", "/public/projects?pageSize=100");
    assert.equal(list.status, 200);
    assert.ok(!JSON.stringify(list.body).match(/client-cut|Client Cut|Confidential/));
    const gateway = createDbGateway(ctx.database.db);
    assert.ok(!(await gateway.listPublicProjectSlugs()).includes("client-cut"));
    assert.equal(await gateway.getProjectPage("client-cut"), null);
    assert.deepEqual(await gateway.findPrivateProject("client-cut"), { projectId: id });
    assert.equal(await gateway.findPrivateProject("made-to-measure"), null);
  });

  test("without access, the project is locked and nothing of it is returned (§17.2)", async () => {
    const locked = await api("GET", "/public/projects/client-cut");
    assert.equal(locked.status, 403);
    assert.equal(locked.body.error.code, "PROJECT_LOCKED");
    assert.ok(!JSON.stringify(locked.body).match(/Client Cut|Confidential|media/));
    const media = await api("GET", `/public/projects/client-cut/media/${secretStill}`);
    assert.equal(media.status, 404);
  });

  test("a wrong password is refused; only an unlockable project can be tried (§17.3)", async () => {
    const wrong = await unlock("not it at all");
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.error.code, "INVALID_PROJECT_PASSWORD");
    assert.equal(wrong.headers.get("set-cookie"), null);
    assert.equal((await api("POST", "/public/projects/made-to-measure/access", { body: { password: "x" } })).status, 404);
    assert.equal((await api("POST", "/public/projects/no-such-thing/access", { body: { password: "x" } })).status, 404);
    const crossSite = await api("POST", "/public/projects/client-cut/access", { body: { password: "x" }, origin: "https://evil.example" });
    assert.equal(crossSite.status, 403);
  });

  test("password attempts are rate-limited per address", async () => {
    for (let i = 0; i < 10; i++) assert.equal((await unlock("guess", "10.3.3.3")).status, 401);
    const limited = await unlock("open sesame 2026", "10.3.3.3");
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, "RATE_LIMITED");
  });

  test("the right password grants a signed HttpOnly cookie for this project only (§17.3)", async () => {
    const granted = await unlock("open sesame 2026");
    assert.equal(granted.status, 204);
    const setCookie = granted.headers.get("set-cookie")!;
    assert.match(setCookie, /^portfolio_access_client-cut=/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Max-Age=43200/);
    const cookie = cookieFrom(granted);

    const project = await api("GET", "/public/projects/client-cut", { cookie });
    assert.equal(project.status, 200);
    assert.equal(project.body.data.title, "Client Cut");
    const text = JSON.stringify(project.body);
    assert.ok(!text.includes('"/media/'), "private media never resolve to the public media path");
    assert.ok(text.includes(`/api/v1/public/projects/client-cut/media/${secretStill}`));
    assert.ok(!text.match(/argon2|passwordHash/));

    const page = await createDbGateway(ctx.database.db).getPrivateProjectPage("client-cut", id);
    const coda = page?.blocks.find((b) => b.type === "projectCoda");
    assert.equal(coda?.type === "projectCoda" && coda.image.src, `/api/v1/public/projects/client-cut/media/${secretStill}`);

    // The cookie is for this project: another slug's cookie name does not match.
    const other = await api("GET", "/public/projects/client-cut", { cookie: cookie.replace("client-cut=", "other=") });
    assert.equal(other.status, 403);
  });

  test("private media are delivered only with access, only if published, with byte ranges", async () => {
    const cookie = cookieFrom(await unlock("open sesame 2026"));
    const full = await fetchMedia(secretStill, cookie);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get("cache-control"), "private, no-store");
    assert.equal(full.headers.get("content-type"), "image/jpeg");
    assert.ok(Number(full.headers.get("content-length")) > 1000);
    const part = await fetchMedia(secretStill, cookie, "bytes=0-99");
    assert.equal(part.status, 206);
    assert.equal(part.headers.get("content-length"), "100");
    assert.match(part.headers.get("content-range")!, /^bytes 0-99\/\d+$/);
    assert.equal((await fetchMedia(secretStill, cookie, "bytes=999999999-")).status, 416);
    const [unrelated] = await ctx.q<{ id: string }>("select id from media where storage_key like '%/n1.mp4'");
    assert.equal((await fetchMedia(unrelated.id, cookie)).status, 404);
  });

  test("a tampered cookie, an expired one, or a replaced password revokes access", async () => {
    const cookie = cookieFrom(await unlock("open sesame 2026"));
    const tampered = cookie.replace(/.$/, (c) => (c === "A" ? "B" : "A"));
    assert.equal((await api("GET", "/public/projects/client-cut", { cookie: tampered })).status, 403);
    // Correctly signed and bound to the current password, but past its expiry.
    const [{ password_hash }] = await ctx.q<{ password_hash: string }>(`select password_hash from projects where id = '${id}'`);
    const payload = `${id}:${Math.floor(Date.now() / 1000) - 10}:${sha256Hex(password_hash).slice(0, 16)}`;
    const expired = `portfolio_access_client-cut=${encodeURIComponent(sign(process.env.PROJECT_ACCESS_SECRET!, payload))}`;
    assert.equal((await api("GET", "/public/projects/client-cut", { cookie: expired })).status, 403);
    assert.equal((await ctx.as("PUT", `/projects/${id}/password`, { password: "a new password 2026" })).status, 204);
    assert.equal((await api("GET", "/public/projects/client-cut", { cookie })).status, 403);
    const fresh = cookieFrom(await unlock("a new password 2026", "10.4.0.1"));
    assert.equal((await api("GET", "/public/projects/client-cut", { cookie: fresh })).status, 200);
  });

  test("making a project public or private takes effect without a publish", async () => {
    await ctx.as("PATCH", `/projects/${id}`, { visibility: "PUBLIC" });
    assert.ok((await createDbGateway(ctx.database.db).listPublicProjectSlugs()).includes("client-cut"));
    await ctx.as("PATCH", `/projects/${id}`, { visibility: "PRIVATE" });
    assert.ok(!(await createDbGateway(ctx.database.db).listPublicProjectSlugs()).includes("client-cut"));
    assert.equal((await api("GET", "/public/projects/client-cut")).status, 403);
  });
});

function fetchMedia(mediaId: string, cookie: string, range?: string) {
  return api("GET", `/public/projects/client-cut/media/${mediaId}`, {
    cookie,
    headers: range ? { range } : {},
    raw: true,
  });
}
