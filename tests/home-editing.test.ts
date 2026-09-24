import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { staticGateway } from "@/features/site-content/static-gateway";
import type { ContentGateway, HomeContent, HomeSection } from "@/features/site-content/site-content.types";
import { createApiTestContext } from "./helpers/api";

type Context = Awaited<ReturnType<typeof createApiTestContext>>;
type Kind = HomeSection["kind"];

// The first section of a kind, as the page renders it.
const section = <K extends Kind>(home: HomeContent | null | undefined, kind: K) =>
  home!.sections.find((s): s is Extract<HomeSection, { kind: K }> => s.kind === kind)!;
type Block = { id: string; type: string; config: { preset?: string; mode?: string }; media: { id: string; mediaId: string }[]; children: Block[] };

// The Home composer's operations, through the API it uses, down to what the
// public Home serves (ADR-0007, ADR-0012, ADR-0013, ADR-0018).
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

  test("the imported Home is published as its five sections, exactly the committed Home", async () => {
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
    assert.deepEqual(await gateway.getHome(), await staticGateway.getHome());
  });

  test("a caption edit is previewable at once and public only after publish", async () => {
    const hero = slot((b) => b.type === "HERO");
    const before = section(await gateway.getHome(), "hero").caption;
    const edited = await ctx.as("PATCH", `/blocks/${hero.id}`, { content: { caption: "Filmed at dawn, Hanoi" } });
    assert.equal(edited.status, 200);
    assert.equal(section((await gateway.previewHome()).value, "hero").caption, "Filmed at dawn, Hanoi");
    assert.equal(section(await gateway.getHome(), "hero").caption, before);
    assert.equal((await ctx.as("GET", "/pages/HOME")).body.data.publication.hasUnpublishedChanges, true);
    assert.equal((await ctx.as("POST", "/pages/HOME/publish")).status, 200);
    assert.equal(section(await gateway.getHome(), "hero").caption, "Filmed at dawn, Hanoi");
  });

  test("the wall reorders as one request and publishes in its new order", async () => {
    const wall = slot((b) => b.config.preset === "homeWall");
    const before = section(await gateway.getHome(), "wall").items.map((item) => item.poster.src);
    const reversed = [...wall.media].reverse().map((item) => item.id);
    assert.equal((await ctx.as("PUT", `/blocks/${wall.id}/media/order`, { blockMediaIds: reversed })).status, 204);
    await ctx.as("POST", "/pages/HOME/publish");
    const after = section(await gateway.getHome(), "wall").items.map((item) => item.poster.src);
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
    assert.equal(section((await gateway.previewHome()).value, "about").more.label, "Read more");
  });

  test("a wall tile can be added from the library and removed again", async () => {
    const wall = slot((b) => b.config.preset === "homeWall");
    const [still] = await ctx.q<{ id: string }>("select id from media where type = 'IMAGE' order by storage_key limit 1");
    const added = await ctx.as("POST", `/blocks/${wall.id}/media`, { mediaId: still.id });
    assert.equal(added.status, 201);
    assert.equal(section((await gateway.previewHome()).value, "wall").items.length, wall.media.length + 1);
    assert.equal((await ctx.as("DELETE", `/blocks/${wall.id}/media/${added.body.data.id}`)).status, 204);
    assert.equal(section((await gateway.previewHome()).value, "wall").items.length, wall.media.length);
  });

  test("sections reorder, repeat and hide; the page follows the composition", async () => {
    // The working copy: earlier tests leave an unpublished edit in it.
    const start = (await gateway.previewHome()).value;
    const byKind = (predicate: (b: Block) => boolean) => blocks.find(predicate)!;
    const wall = byKind((b) => b.config.preset === "homeWall");
    const about = byKind((b) => b.config.preset === "homeAbout");
    const order = blocks.map((b) => b.id);
    const swapped = order.map((id) => (id === wall.id ? about.id : id === about.id ? wall.id : id));
    assert.equal((await ctx.as("PUT", "/pages/HOME/blocks/order", { parentBlockId: null, blockIds: swapped })).status, 204);
    const frames = byKind((b) => b.config.mode === "JUSTIFIED_ROWS");
    const copy = await ctx.as("POST", `/blocks/${frames.id}/duplicate`);
    assert.equal(copy.status, 201, JSON.stringify(copy.body));
    const published = await ctx.as("POST", "/pages/HOME/publish");
    assert.equal(published.status, 200, JSON.stringify(published.body));
    const kinds = (await gateway.getHome()).sections.map((s) => s.kind);
    assert.deepEqual(kinds, ["hero", "identity", "about", "wall", "frames", "frames"]);
    // Hidden sections are never published.
    await ctx.as("PATCH", `/blocks/${copy.body.data.id}`, { isHidden: true });
    await ctx.as("PATCH", `/blocks/${about.id}`, { isHidden: true });
    await ctx.as("POST", "/pages/HOME/publish");
    assert.deepEqual((await gateway.getHome()).sections.map((s) => s.kind), ["hero", "identity", "wall", "frames"]);
    // Back to where it started.
    await ctx.as("DELETE", `/blocks/${copy.body.data.id}`);
    await ctx.as("PATCH", `/blocks/${about.id}`, { isHidden: false });
    await ctx.as("PUT", "/pages/HOME/blocks/order", { parentBlockId: null, blockIds: order });
    await ctx.as("POST", "/pages/HOME/publish");
    assert.deepEqual(await gateway.getHome(), start);
  });

  test("Home's rules are refused at publish, with the reason, and nothing live changes", async () => {
    const live = await gateway.getHome();
    const identity = blocks.find((b) => b.config.preset === "homeIdentity")!;
    const refused = async (pattern: RegExp) => {
      const response = await ctx.as("POST", "/pages/HOME/publish");
      assert.equal(response.status, 422);
      assert.match(JSON.stringify(response.body.error.details.issues), pattern);
      assert.match((await gateway.previewHome()).issue!, pattern);
      assert.deepEqual(await gateway.getHome(), live);
    };
    // The hero opens Home, once.
    const order = blocks.map((b) => b.id);
    await ctx.as("PUT", "/pages/HOME/blocks/order", { parentBlockId: null, blockIds: [...order.slice(1), order[0]] });
    await refused(/the hero opens Home, once/);
    await ctx.as("PUT", "/pages/HOME/blocks/order", { parentBlockId: null, blockIds: order });
    // The identity carries the page's name: exactly once.
    await ctx.as("PATCH", `/blocks/${identity.id}`, { isHidden: true });
    await refused(/identity exactly once, found 0/);
    await ctx.as("PATCH", `/blocks/${identity.id}`, { isHidden: false });
    const twin = await ctx.as("POST", `/blocks/${identity.id}/duplicate`);
    await refused(/identity exactly once, found 2/);
    await ctx.as("DELETE", `/blocks/${twin.body.data.id}`);
    // A generic block has no approved Home dress.
    const text = await ctx.as("POST", "/pages/HOME/blocks", { type: "TEXT", content: { kind: "richText", paragraphs: [["Hello"]] } });
    assert.equal(text.status, 201);
    await refused(/has no place on Home/);
    await ctx.as("DELETE", `/blocks/${text.body.data.id}`);
    assert.equal((await ctx.as("POST", "/pages/HOME/publish")).status, 200);
  });
});
