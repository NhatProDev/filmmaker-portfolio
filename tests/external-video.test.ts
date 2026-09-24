import "./helpers/access-secret";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { embedUrl, parseExternalVideo } from "@/features/media/external-video";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { createApiTestContext } from "./helpers/api";

// Phase 3B: YouTube and Vimeo on public pages, CLICK_TO_PLAY only, through the
// provider's own player built from the video id alone.

describe("external video addresses", () => {
  test("YouTube and Vimeo addresses reduce to the provider's video id", () => {
    const yt = { provider: "youtube", id: "dQw4w9WgXcQ" };
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ]) {
      assert.deepEqual(parseExternalVideo("youtube", url), yt, url);
    }
    assert.deepEqual(parseExternalVideo("vimeo", "https://vimeo.com/123456"), { provider: "vimeo", id: "123456" });
    assert.deepEqual(parseExternalVideo("vimeo", "https://vimeo.com/123456/abcdef1234"), { provider: "vimeo", id: "123456", hash: "abcdef1234" });
    assert.deepEqual(parseExternalVideo("vimeo", "https://player.vimeo.com/video/123456?h=abcdef1234"), {
      provider: "vimeo",
      id: "123456",
      hash: "abcdef1234",
    });
    assert.deepEqual(parseExternalVideo("vimeo", "https://vimeo.com/channels/staffpicks/123456"), { provider: "vimeo", id: "123456" });
  });

  test("anything else is refused: other hosts, http, credentials, bad ids, wrong provider", () => {
    for (const [provider, url] of [
      ["youtube", "http://www.youtube.com/watch?v=dQw4w9WgXcQ"],
      ["youtube", "https://evil.example/watch?v=dQw4w9WgXcQ"],
      ["youtube", "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ"],
      ["youtube", "https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ"],
      ["youtube", "https://www.youtube.com/watch?v=short"],
      ["youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ%22onload"],
      ["youtube", "https://www.youtube.com/playlist?list=PL123"],
      ["vimeo", "https://vimeo.com/about"],
      ["vimeo", "https://vimeo.com/123456/<script>"],
      ["vimeo", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
      ["dailymotion", "https://www.dailymotion.com/video/x7tgad0"],
      ["youtube", "javascript:alert(1)"],
    ]) {
      assert.equal(parseExternalVideo(provider, url), null, `${provider} ${url}`);
    }
  });

  test("the player address is built from the id, on the CSP's provider origins", () => {
    assert.equal(embedUrl({ provider: "youtube", id: "dQw4w9WgXcQ" }), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1&rel=0");
    assert.equal(embedUrl({ provider: "vimeo", id: "123456", hash: "abcdef1234" }), "https://player.vimeo.com/video/123456?h=abcdef1234&autoplay=1&dnt=1");
  });
});

describe("external video on a published project", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  let gateway: ReturnType<typeof createDbGateway>;
  let cover: string;
  let poster: string;
  before(async () => {
    ctx = await createApiTestContext();
    gateway = createDbGateway(ctx.database.db);
    cover = (await ctx.q<{ id: string }>(`select id from media where storage_key like '%/mtm-sketch.jpg'`))[0].id;
    poster = (await ctx.q<{ id: string }>(`select id from media where storage_key like '%/mtm-shopfront.jpg'`))[0].id;
  });
  after(() => ctx.close());

  const external = async (provider: string, url: string) => {
    const response = await ctx.as("POST", "/media/external", { provider, url, altText: "Trailer" });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.data.id as string;
  };
  const project = async (slug: string) =>
    (await ctx.as("POST", "/projects", { title: slug, slug, year: 2026, coverMediaId: cover })).body.data.id as string;
  const block = async (projectId: string, body: Record<string, unknown>) => {
    const response = await ctx.as("POST", `/projects/${projectId}/blocks`, body);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.data.id as string;
  };

  test("the Media Library refuses an address no player can show", async () => {
    for (const [provider, url] of [
      ["youtube", "https://www.youtube.com/playlist?list=PL1"],
      ["vimeo", "https://vimeo.com/about"],
      ["youtube", "https://youtu.be/abc"],
    ]) {
      const response = await ctx.as("POST", "/media/external", { provider, url });
      assert.equal(response.status, 422, url);
    }
  });

  test("YouTube in a VIDEO block and Vimeo in a GRID publish as click-to-play players", async () => {
    const id = await project("external-films");
    const yt = await external("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const vimeo = await external("vimeo", "https://vimeo.com/76979871");
    const video = await block(id, { type: "VIDEO", config: { playback: { mode: "CLICK_TO_PLAY" } } });
    assert.equal((await ctx.as("POST", `/blocks/${video}/media`, { mediaId: yt, posterMediaId: poster })).status, 201);
    const grid = await block(id, { type: "GRID" });
    const child = await block(id, {
      type: "VIDEO",
      parentBlockId: grid,
      config: { playback: { mode: "CLICK_TO_PLAY" }, placement: { desktop: { colStart: 1, colSpan: 6 } } },
    });
    assert.equal((await ctx.as("POST", `/blocks/${child}/media`, { mediaId: vimeo })).status, 201);
    const published = await ctx.as("POST", `/projects/${id}/publish`);
    assert.equal(published.status, 200, JSON.stringify(published.body));

    const page = await gateway.getProjectPage("external-films");
    const film = page!.blocks.find((b) => b.type === "externalVideo");
    assert.ok(film && film.type === "externalVideo");
    assert.equal(film.external.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1&rel=0");
    assert.equal(film.external.title, "Trailer");
    assert.ok(film.external.poster, "the placement poster frames the player before it loads");
    const inGrid = page!.blocks.find((b) => b.type === "grid");
    assert.ok(inGrid && inGrid.type === "grid");
    const cell = inGrid.cells[0].block;
    assert.ok(cell.type === "externalVideo" && cell.external.embedUrl.startsWith("https://player.vimeo.com/video/76979871?"));
    assert.equal(cell.external.poster, null, "no poster: the empty frame");
  });

  test("autoplay on external video is refused when placed; the opening refuses it at Publish", async () => {
    const id = await project("external-refused");
    const yt = await external("youtube", "https://youtu.be/dQw4w9WgXcQ");
    const auto = await block(id, { type: "VIDEO", config: { playback: { mode: "AUTOPLAY_VISIBLE" } } });
    assert.equal((await ctx.as("POST", `/blocks/${auto}/media`, { mediaId: yt })).status, 422);
    await ctx.as("DELETE", `/blocks/${auto}`);

    const opening = await block(id, {
      type: "HERO",
      position: 0,
      config: {
        playback: { mode: "CLICK_TO_PLAY" },
        overlay: { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true },
      },
    });
    assert.equal((await ctx.as("POST", `/blocks/${opening}/media`, { mediaId: yt })).status, 201);
    const refused = await ctx.as("POST", `/projects/${id}/publish`);
    assert.equal(refused.status, 422);
    assert.match(JSON.stringify(refused.body), /opening plays a hosted film/);
  });

  test("a stored address the player cannot show stops Publish with the reason", async () => {
    const id = await project("external-legacy");
    const media = await external("youtube", "https://youtu.be/dQw4w9WgXcQ");
    // An asset stored before addresses were checked.
    await ctx.q(`update media set external_url = 'https://www.youtube.com/playlist?list=PL1' where id = '${media}'`);
    const video = await block(id, { type: "VIDEO", config: { playback: { mode: "CLICK_TO_PLAY" } } });
    await ctx.as("POST", `/blocks/${video}/media`, { mediaId: media });
    const refused = await ctx.as("POST", `/projects/${id}/publish`);
    assert.equal(refused.status, 422);
    assert.match(JSON.stringify(refused.body), /not a YouTube or Vimeo video address/);
  });
});
