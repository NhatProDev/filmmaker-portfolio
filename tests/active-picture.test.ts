import "./helpers/access-secret";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { createApiTestContext } from "./helpers/api";

// Phase 3B, ADR-0016: a letterboxed file declares its active picture as a
// closed choice on the asset; the renderer frames that picture on every
// generic Project Detail surface. Clean masters need nothing.

describe("the active picture of a letterboxed asset (ADR-0016)", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  let gateway: ReturnType<typeof createDbGateway>;
  let cover: string;
  let film: string;
  let still: string;
  before(async () => {
    ctx = await createApiTestContext();
    gateway = createDbGateway(ctx.database.db);
    const id = async (like: string) => (await ctx.q<{ id: string }>(`select id from media where storage_key like '%/${like}'`))[0].id;
    cover = await id("mtm-sketch.jpg");
    film = await id("c1.mp4");
    still = await id("desk-05.jpg");
  });
  after(() => ctx.close());

  const patch = (mediaId: string, body: Record<string, unknown>) => ctx.as("PATCH", `/media/${mediaId}`, body);

  test("a closed choice: FULL or one of three ratios; FULL is stored as nothing", async () => {
    assert.equal((await ctx.as("GET", `/media/${film}`)).body.data.activePicture, "FULL");
    const set = await patch(film, { activePicture: "2.39" });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal(set.body.data.activePicture, "2.39");
    for (const bad of ["2.35", "2.39:1", 2.39, "CUSTOM", { top: 87, bottom: 87 }]) {
      assert.equal((await patch(film, { activePicture: bad })).status, 422, JSON.stringify(bad));
    }
    // Arbitrary geometry is not a field at all.
    assert.equal((await patch(film, { crop: { top: 10 } })).status, 422);
    const reset = await patch(film, { activePicture: "FULL" });
    assert.equal(reset.body.data.activePicture, "FULL");
    assert.equal((await ctx.q<{ active_picture: string | null }>(`select active_picture from media where id = '${film}'`))[0].active_picture, null);
  });

  test("an external video's player frames its own picture: refused by the API and the database", async () => {
    const external = (await ctx.as("POST", "/media/external", { provider: "vimeo", url: "https://vimeo.com/76979871" })).body.data.id;
    assert.equal((await patch(external, { activePicture: "2.39" })).status, 422);
    await assert.rejects(ctx.q(`update media set active_picture = '2.39' where id = '${external}'`), /active_picture_stored/);
  });

  test("a VIDEO block frames the film's picture; its clean poster keeps its own", async () => {
    const project = (await ctx.as("POST", "/projects", { title: "Scope", slug: "scope-film", year: 2026, coverMediaId: cover })).body.data.id;
    const video = (await ctx.as("POST", `/projects/${project}/blocks`, { type: "VIDEO", config: { playback: { mode: "CLICK_TO_PLAY" } } })).body.data.id;
    await ctx.as("POST", `/blocks/${video}/media`, { mediaId: film, posterMediaId: still });
    const image = (await ctx.as("POST", `/projects/${project}/blocks`, { type: "IMAGE" })).body.data.id;
    await ctx.as("POST", `/blocks/${image}/media`, { mediaId: still });
    assert.equal((await ctx.as("POST", `/projects/${project}/publish`)).status, 200);
    let page = await gateway.getProjectPage("scope-film");
    let block = page!.blocks.find((b) => b.type === "video");
    assert.ok(block && block.type === "video");
    assert.equal(block.video.activeAspect, undefined, "a clean master renders as encoded");

    // The choice is part of the working copy: visitors see it after Publish.
    await patch(film, { activePicture: "2.39" });
    const summary = (await ctx.as("GET", `/projects/${project}`)).body.data;
    assert.equal((summary.publication ?? summary).hasUnpublishedChanges, true);
    page = await gateway.getProjectPage("scope-film");
    block = page!.blocks.find((b) => b.type === "video");
    assert.ok(block && block.type === "video" && block.video.activeAspect === undefined);

    assert.equal((await ctx.as("POST", `/projects/${project}/publish`)).status, 200);
    page = await gateway.getProjectPage("scope-film");
    block = page!.blocks.find((b) => b.type === "video");
    assert.ok(block && block.type === "video");
    assert.equal(block.video.activeAspect, 2.39);
    assert.equal(block.video.poster?.activeAspect, undefined, "each layer from its own asset");
    const still_ = page!.blocks.find((b) => b.type === "image");
    assert.ok(still_ && still_.type === "image" && still_.image.activeAspect === undefined);
    await patch(film, { activePicture: "FULL" });
  });

  test("an area that is not a letterbox of its file is refused at Publish, not guessed at", async () => {
    const project = (await ctx.as("POST", "/projects", { title: "Wide", slug: "wide-still", year: 2026, coverMediaId: cover })).body.data.id;
    const wide = (
      await ctx.q<{ id: string }>(
        `insert into media (type, status, storage_provider, storage_key, mime_type, width, height, active_picture)
         values ('IMAGE', 'READY', 'local', 'works/wide.jpg', 'image/jpeg', 2400, 1000, '1.85') returning id`,
      )
    )[0].id;
    const image = (await ctx.as("POST", `/projects/${project}/blocks`, { type: "IMAGE" })).body.data.id;
    await ctx.as("POST", `/blocks/${image}/media`, { mediaId: wide });
    const refused = await ctx.as("POST", `/projects/${project}/publish`);
    assert.equal(refused.status, 422);
    assert.match(JSON.stringify(refused.body), /not letterboxed/);
  });
});
