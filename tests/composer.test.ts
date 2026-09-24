import "./helpers/access-secret";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/features/authentication/auth.service";
import { TEMPLATES } from "@/features/project-builder/templates";
import { createDbGateway } from "@/features/site-content/db-gateway";
import type { ProjectBlock, ProjectPage } from "@/features/site-content/site-content.types";
import { proxy } from "@/proxy";
import { createApiTestContext } from "./helpers/api";

// Phase 3A: the composer's contract end to end — templates, presets inserted
// whole, generic compositions through Publish to the public view model, draft
// isolation, private delivery, and previewing a project never published.

type Context = Awaited<ReturnType<typeof createApiTestContext>>;
type Block = { id: string; type: string; isHidden: boolean; config: Record<string, unknown>; children: Block[]; media: { id: string }[] };

const types = (page: ProjectPage | null) => (page?.blocks ?? []).map((block) => block.type);
const find = <T extends ProjectBlock["type"]>(page: ProjectPage | null, type: T) =>
  page?.blocks.find((block): block is Extract<ProjectBlock, { type: T }> => block.type === type);

describe("the Project Detail composer (Phase 3A)", () => {
  let ctx: Context;
  let gateway: ReturnType<typeof createDbGateway>;
  let cover: string;
  let still: string;
  let other: string;
  let film: string;
  let poster: string;
  before(async () => {
    ctx = await createApiTestContext();
    gateway = createDbGateway(ctx.database.db);
    const id = async (like: string) => (await ctx.q<{ id: string }>(`select id from media where storage_key like '%/${like}'`))[0].id;
    cover = await id("mtm-sketch.jpg");
    still = await id("desk-05.jpg");
    other = await id("desk-02.jpg");
    film = await id("c1.mp4");
    poster = await id("mtm-shopfront.jpg");
  });
  after(async () => {
    await ctx.close();
  });

  const project = async (slug: string, extra: Record<string, unknown> = {}) => {
    const response = await ctx.as("POST", "/projects", { title: slug, slug, year: 2026, coverMediaId: cover, ...extra });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.data as { id: string; blocks: Block[] };
  };
  const add = async (projectId: string, body: Record<string, unknown>) => {
    const response = await ctx.as("POST", `/projects/${projectId}/blocks`, body);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.data as Block;
  };
  const place = async (blockId: string, mediaId: string, extra: Record<string, unknown> = {}) => {
    const response = await ctx.as("POST", `/blocks/${blockId}/media`, { mediaId, ...extra });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.data as { id: string };
  };
  const publish = async (projectId: string) => {
    const response = await ctx.as("POST", `/projects/${projectId}/publish`);
    assert.equal(response.status, 200, JSON.stringify(response.body));
  };

  test("every template seeds a composition that publishes at once; scaffolding stays hidden", async () => {
    for (const [template, definition] of Object.entries(TEMPLATES)) {
      const slug = `tpl-${template.toLowerCase().replace(/_/g, "-")}`;
      const created = await project(slug, { template });
      assert.equal(created.blocks.length, definition.blocks.length, template);
      assert.deepEqual(
        created.blocks.map((b) => [b.type, b.isHidden]),
        definition.blocks.map((b) => [b.type, b.isHidden ?? false]),
      );
      await publish(created.id);
      const page = await gateway.getProjectPage(slug);
      assert.equal(page?.blocks[0].type, "opening");
      assert.ok(types(page).includes("projectMeta"));
      assert.ok(!types(page).some((t) => t === "projectStills" || t === "gallery" || t === "grid" || t === "projectCoda"), "hidden scaffolds are never published");
    }
  });

  test("a template is copied, not linked: editing one project leaves the next untouched", async () => {
    const first = await project("copy-a", { template: "FILM_FIRST" });
    await ctx.as("DELETE", `/blocks/${first.blocks[1].id}`);
    const second = await project("copy-b", { template: "FILM_FIRST" });
    assert.equal(second.blocks.length, TEMPLATES.FILM_FIRST.blocks.length);
    assert.equal((await ctx.as("POST", "/projects", { title: "x", slug: "tpl-bad", template: "WEBFLOW" })).status, 422);
  });

  test("a preset arrives whole in one request; an invalid child writes nothing", async () => {
    const { id } = await project("presets");
    const loop = await add(id, {
      type: "GRID",
      config: { preset: "projectLoop" },
      children: [
        { type: "VIDEO", config: { playback: { mode: "AUTOPLAY_VISIBLE" } } },
        { type: "TEXT", content: { kind: "richText", paragraphs: [["A caption"]] }, config: { role: "caption" } },
      ],
    });
    assert.deepEqual(loop.children.map((c) => c.type), ["VIDEO", "TEXT"]);
    const count = async () => (await ctx.q<{ n: number }>(`select count(*)::int as n from project_blocks`))[0].n;
    const before = await count();
    for (const body of [
      { type: "GRID", children: [{ type: "GRID" }] },
      { type: "GRID", children: [{ type: "GALLERY", config: { mode: "SLIDESHOW" } }] },
      { type: "GRID", children: [{ type: "TEXT", content: { kind: "richText", paragraphs: [["x"]] }, config: { color: "red" } }] },
      { type: "GRID", children: [{ type: "VIDEO", config: { playback: { mode: "AUTOPLAY_AMBIENT" } } }] },
      { type: "IMAGE", children: [{ type: "SPACER", config: { size: "S" } }] },
      { type: "GRID", parentBlockId: loop.id, children: [] },
    ]) {
      assert.equal((await ctx.as("POST", `/projects/${id}/blocks`, body)).status, 422, JSON.stringify(body));
    }
    assert.equal(await count(), before);
  });

  test("presets belong to their page and to the top level", async () => {
    const { id } = await project("preset-rules");
    const home = await ctx.as("POST", `/projects/${id}/blocks`, { type: "GALLERY", config: { mode: "VIDEO_GRID", columns: { desktop: 3, tablet: 2, mobile: 1 }, playback: { mode: "AUTOPLAY_VISIBLE" }, preset: "homeWall" } });
    assert.equal(home.status, 422);
    assert.match(JSON.stringify(home.body), /belongs to Home/);
    const onPage = await ctx.as("POST", "/pages/HOME/blocks", { type: "GRID", config: { preset: "projectMeta" } });
    assert.equal(onPage.status, 422);
    const grid = await add(id, { type: "GRID" });
    const nested = await ctx.as("POST", `/projects/${id}/blocks`, { type: "IMAGE", parentBlockId: grid.id, config: { preset: "projectCoda" } });
    assert.equal(nested.status, 422);
    assert.match(JSON.stringify(nested.body), /top level/);
  });

  test("a free composition of every block type publishes in its own order, with alt and posters resolved", async () => {
    const { id } = await project("free-composition", { template: "FILM_FIRST" });
    const opening = (await ctx.as("GET", `/projects/${id}`)).body.data.blocks[0] as Block;
    await place(opening.id, film, { posterMediaId: poster, altText: "The shopfront at dawn" });
    await add(id, { type: "TEXT", content: { kind: "richText", paragraphs: [["A first paragraph."], ["A second, ", "in two runs."]] }, config: { role: "lead" } });
    const grid = await add(id, {
      type: "GRID",
      children: [
        { type: "TEXT", content: { kind: "richText", paragraphs: [["Beside the image."]] }, config: { placement: { desktop: { colStart: 1, colSpan: 4 } } } },
        { type: "IMAGE", config: { placement: { desktop: { colStart: 6, colSpan: 7 }, mobile: { colStart: 3, colSpan: 10 }, valign: "end" } } },
      ],
    });
    await place(grid.children[1].id, still, { altText: "" });
    const gallery = await add(id, { type: "GALLERY", content: { label: "Frames" }, config: { mode: "HORIZONTAL_STRIP" } });
    await place(gallery.id, other);
    await place(gallery.id, film);
    await add(id, { type: "SPACER", config: { size: "L" } });

    await publish(id);
    const page = await gateway.getProjectPage("free-composition");
    assert.deepEqual(types(page), ["opening", "projectMeta", "projectCredits", "text", "grid", "gallery", "spacer"]);
    const open = find(page, "opening")!;
    assert.equal(open.image.alt, "The shopfront at dawn");
    assert.match(open.image.src, /mtm-shopfront/);
    assert.ok(open.film);
    const cells = find(page, "grid")!.cells;
    assert.deepEqual(cells.map((c) => c.block.type), ["text", "image"]);
    assert.deepEqual(cells[1].placement, { desktop: { colStart: 6, colSpan: 7 }, mobile: { colStart: 3, colSpan: 10 }, valign: "end" });
    assert.equal(cells[1].block.type === "image" && cells[1].block.image.alt, "", "a decorative placement stays decorative");
    const strip = find(page, "gallery")!;
    assert.deepEqual(strip.items.map((i) => i.kind), ["image", "video"]);
    assert.equal(strip.label, "Frames");
  });

  test("the working copy is private until Publish; preview shows it at once", async () => {
    const { id } = await project("draft-isolation", { template: "EDITORIAL" });
    await publish(id);
    const text = await add(id, { type: "TEXT", content: { kind: "richText", paragraphs: [["Only in the draft."]] } });
    assert.ok(!types(await gateway.getProjectPage("draft-isolation")).includes("text"));
    const preview = await gateway.previewProjectPage("draft-isolation");
    assert.ok(types(preview.value).includes("text"));
    // Reordering and hiding are drafts too.
    const blocks = (await ctx.as("GET", `/projects/${id}`)).body.data.blocks as Block[];
    const ids = blocks.map((b) => b.id);
    const reordered = [ids[0], text.id, ...ids.slice(1).filter((x) => x !== text.id)];
    assert.equal((await ctx.as("PUT", `/projects/${id}/blocks/order`, { parentBlockId: null, blockIds: reordered })).status, 204);
    assert.equal(types((await gateway.previewProjectPage("draft-isolation")).value)[1], "text");
    assert.equal(types(await gateway.getProjectPage("draft-isolation"))[1], "projectMeta");
    await publish(id);
    assert.equal(types(await gateway.getProjectPage("draft-isolation"))[1], "text");
    const summary = (await ctx.as("GET", `/projects/${id}`)).body.data.publication;
    assert.equal(summary.hasUnpublishedChanges, false);
  });

  test("an incomplete block stops Publish with its reason; hiding it lets the page publish", async () => {
    const { id } = await project("incomplete");
    const image = await add(id, { type: "IMAGE" });
    const refused = await ctx.as("POST", `/projects/${id}/publish`);
    assert.equal(refused.status, 422);
    assert.match(JSON.stringify(refused.body), /no media yet/);
    await ctx.as("PATCH", `/blocks/${image.id}`, { isHidden: true });
    await publish(id);
  });

  test("a PRIVATE project's generic blocks deliver media only through the access-checked route", async () => {
    const { id } = await project("private-free", { visibility: "PRIVATE", password: "open sesame 2026" });
    const gallery = await add(id, { type: "GALLERY", config: { mode: "SLIDESHOW" } });
    await place(gallery.id, still);
    await publish(id);
    const page = await gateway.getPrivateProjectPage("private-free", id);
    const item = find(page, "gallery")!.items[0];
    assert.equal(item.kind === "image" && item.image.src, `/api/v1/public/projects/private-free/media/${still}`);
    assert.equal(await gateway.getProjectPage("private-free"), null);
  });

  test("a project never published can be previewed by an admin, and by nobody else", async () => {
    await project("never-published");
    const request = (cookie?: string) => new NextRequest("http://studio.test/works/never-published", { headers: cookie ? { cookie } : {} });
    const session = ctx.cookie;
    assert.ok(session.startsWith(`${ADMIN_SESSION_COOKIE}=`));
    const draft = "__prerender_bypass=anything";
    const passes = (response: Response) => response.headers.get("x-middleware-next") === "1";
    const rewritten = (response: Response) => Boolean(response.headers.get("x-middleware-rewrite")?.includes("/not-found"));
    assert.ok(passes(await proxy(request(`${session}; ${draft}`))));
    assert.ok(rewritten(await proxy(request(draft))), "a draft cookie alone is not enough");
    assert.ok(rewritten(await proxy(request(`${ADMIN_SESSION_COOKIE}=forged; ${draft}`))), "nor a forged session");
    assert.ok(rewritten(await proxy(request(session))), "nor a session without preview");
  });
});
