import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { createApiTestContext } from "./helpers/api";

// A CSS module outside Next.js: every class name is its own key.
// eslint-disable-next-line @typescript-eslint/no-require-imports
(require("node:module") as { _extensions: Record<string, (m: { exports: unknown }) => void> })._extensions[".css"] = (m) => {
  const classes: object = new Proxy({}, { get: (_, key) => (key === "__esModule" ? false : key === "default" ? classes : String(key)) });
  m.exports = classes;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { JustifiedRows } = require("@/components/media/JustifiedRows") as typeof import("@/components/media/JustifiedRows");

// Phase 3D-4, ADR-0016: justified rows (project galleries and albums) pack and
// frame a letterboxed still on its active picture. A still without one — every
// asset in production today — renders exactly as before, and Home's locked
// frames keep drawing files as encoded until their design review.

const still = { src: "https://cdn.test/a.jpg", width: 1600, height: 900, alt: "A" };
const other = { src: "https://cdn.test/b.jpg", width: 800, height: 1200, alt: "" };
const letterboxed = { ...still, src: "https://cdn.test/c.jpg", activeAspect: 2.39 };
const render = (items: (typeof still & { activeAspect?: number })[], framing?: "active" | "encoded") =>
  renderToStaticMarkup(createElement(JustifiedRows, { id: "g", items, ...(framing ? { framing } : {}) }));

describe("justified rows and the active picture (ADR-0016)", () => {
  test("without an active picture the markup is the same under either framing", () => {
    const encoded = render([still, other]);
    assert.equal(render([still, other], "active"), encoded);
    assert.equal(render([still, other], "encoded"), encoded);
  });

  test("encoded framing ignores a declared picture: Home stays as it is", () => {
    const plain = render([{ ...letterboxed, activeAspect: undefined }, other]);
    assert.equal(render([letterboxed, other], "encoded"), plain);
  });

  test("active framing packs at the picture's aspect and centres the file, undistorted", () => {
    const html = render([letterboxed, other], "active");
    // The cell takes the picture's aspect; the file keeps its own.
    assert.match(html, /--aspect:2\.39;--file:1\.7777777777777777/);
    assert.match(html, /activeCell/);
    assert.match(html, /<img[^>]*width="1600"[^>]*height="900"/);
    // The row packing is computed from the picture's aspect, deterministically.
    assert.equal(render([letterboxed, other], "active"), html);
    assert.notEqual(html.match(/<style[\s\S]*?<\/style>/)?.[0], render([still, other]).match(/<style[\s\S]*?<\/style>/)?.[0]);
    // The other still is untouched.
    assert.match(html, /--aspect:0\.6666666666666666"/);
  });
});

describe("albums carry the active picture to their rows", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  before(async () => {
    ctx = await createApiTestContext();
  });
  after(() => ctx.close());

  test("a published album's letterboxed still declares its picture; the others do not", async () => {
    const [wide, plain] = await ctx.q<{ id: string }>(
      "select id from media where type = 'IMAGE' and width is not null and width::float / height < 2 order by storage_key limit 2",
    );
    assert.equal((await ctx.as("PATCH", `/media/${wide.id}`, { activePicture: "2.39" })).status, 200);
    const album = (await ctx.as("POST", "/albums", { title: "Scope stills", slug: "scope-stills" })).body.data;
    await ctx.as("POST", `/albums/${album.id}/media`, { mediaId: wide.id });
    await ctx.as("POST", `/albums/${album.id}/media`, { mediaId: plain.id });
    assert.equal((await ctx.as("POST", `/albums/${album.id}/publish`)).status, 200);
    const page = await createDbGateway(ctx.database.db).getAlbumPage("scope-stills");
    assert.deepEqual(
      page!.items.map((item) => item.image.activeAspect),
      [2.39, undefined],
    );
    assert.ok(!("activeAspect" in page!.items[1].image), "absent, not undefined, when unused");
  });
});
