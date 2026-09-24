import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createDbGateway } from "@/features/site-content/db-gateway";
import type { ContentGateway } from "@/features/site-content/site-content.types";
import { createApiTestContext } from "./helpers/api";

type Context = Awaited<ReturnType<typeof createApiTestContext>>;
type Block = { id: string; type: string; config: { preset?: string; mode?: string }; media: { id: string; mediaId: string }[]; children: Block[] };

// The Home editor's operations, through the API it uses, down to what the
// public Home serves (ADR-0007, ADR-0012, ADR-0013).
describe("editing and publishing Home", () => {
  let ctx: Context;
  let gateway: ContentGateway;
  let blocks: Block[];
  before(async () => {
    ctx = await createApiTestContext();
    gateway = createDbGateway(ctx.database.db);
    blocks = (await ctx.as("GET", "/pages/HOME")).body.data.blocks;
  });
  after(() => ctx.close());

  const slot = (predicate: (b: Block) => boolean) => blocks.find(predicate)!;

  test("the imported Home is published and editable as five fixed slots", async () => {
    const page = (await ctx.as("GET", "/pages/HOME")).body.data;
    assert.equal(page.publication.isPublished, true);
    assert.equal(page.publication.hasUnpublishedChanges, false);
    assert.deepEqual(page.publication.issues, []);
    assert.deepEqual(
      blocks.map((b) => [b.type, b.config.preset ?? b.config.mode]),
      [
        ["HERO", undefined],
        ["GRID", "homeIdentity"],
        ["GALLERY", "homeWall"],
        ["GRID", "homeAbout"],
        ["GALLERY", "JUSTIFIED_ROWS"],
      ],
    );
  });

  test("a caption edit is previewable at once and public only after publish", async () => {
    const hero = slot((b) => b.type === "HERO");
    const before = (await gateway.getHome()).hero.caption;
    const edited = await ctx.as("PATCH", `/blocks/${hero.id}`, { content: { caption: "Filmed at dawn, Hanoi" } });
    assert.equal(edited.status, 200);
    assert.equal((await gateway.previewHome()).value?.hero.caption, "Filmed at dawn, Hanoi");
    assert.equal((await gateway.getHome()).hero.caption, before);
    assert.equal((await ctx.as("GET", "/pages/HOME")).body.data.publication.hasUnpublishedChanges, true);
    assert.equal((await ctx.as("POST", "/pages/HOME/publish")).status, 200);
    assert.equal((await gateway.getHome()).hero.caption, "Filmed at dawn, Hanoi");
  });

  test("the wall reorders as one request and publishes in its new order", async () => {
    const wall = slot((b) => b.config.preset === "homeWall");
    const before = (await gateway.getHome()).wall.items.map((item) => item.poster.src);
    const reversed = [...wall.media].reverse().map((item) => item.id);
    assert.equal((await ctx.as("PUT", `/blocks/${wall.id}/media/order`, { blockMediaIds: reversed })).status, 204);
    await ctx.as("POST", "/pages/HOME/publish");
    const after = (await gateway.getHome()).wall.items.map((item) => item.poster.src);
    assert.deepEqual(after, [...before].reverse());
    await ctx.as("PUT", `/blocks/${wall.id}/media/order`, { blockMediaIds: [...reversed].reverse() });
    await ctx.as("POST", "/pages/HOME/publish");
  });

  test("identity and the About link are typed text; invalid edits are refused", async () => {
    const identity = slot((b) => b.config.preset === "homeIdentity");
    const display = identity.children[0];
    assert.equal(
      (await ctx.as("PATCH", `/blocks/${display.id}`, { content: { kind: "richText", paragraphs: [[""]] } })).status,
      422,
    );
    const about = slot((b) => b.config.preset === "homeAbout");
    const more = about.children[1];
    const unsafe = await ctx.as("PATCH", `/blocks/${more.id}`, {
      content: { kind: "richText", paragraphs: [[{ link: { href: "javascript:alert(1)", text: "More" } }]] },
    });
    assert.equal(unsafe.status, 422);
    const ok = await ctx.as("PATCH", `/blocks/${more.id}`, {
      content: { kind: "richText", paragraphs: [[{ link: { href: "/about", text: "Read more" } }]] },
    });
    assert.equal(ok.status, 200);
    assert.equal((await gateway.previewHome()).value?.about.more.label, "Read more");
  });

  test("a wall tile can be added from the library and removed again", async () => {
    const wall = slot((b) => b.config.preset === "homeWall");
    const [still] = await ctx.q<{ id: string }>("select id from media where type = 'IMAGE' order by storage_key limit 1");
    const added = await ctx.as("POST", `/blocks/${wall.id}/media`, { mediaId: still.id });
    assert.equal(added.status, 201);
    assert.equal((await gateway.previewHome()).value?.wall.items.length, wall.media.length + 1);
    assert.equal((await ctx.as("DELETE", `/blocks/${wall.id}/media/${added.body.data.id}`)).status, 204);
    assert.equal((await gateway.previewHome()).value?.wall.items.length, wall.media.length);
  });

  test("a Home that no longer fits its template cannot be published, and nothing live changes", async () => {
    const coda = slot((b) => b.config.mode === "JUSTIFIED_ROWS");
    const live = await gateway.getHome();
    await ctx.as("PATCH", `/blocks/${coda.id}`, { isHidden: true });
    const refused = await ctx.as("POST", "/pages/HOME/publish");
    assert.equal(refused.status, 422);
    assert.match(JSON.stringify(refused.body.error.details.issues), /5 blocks/);
    assert.match((await gateway.previewHome()).issue!, /5 blocks/);
    assert.deepEqual(await gateway.getHome(), live);
    await ctx.as("PATCH", `/blocks/${coda.id}`, { isHidden: false });
  });
});
