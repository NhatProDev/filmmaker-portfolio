import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { createAlbumRouter } from "@/features/site-content/project-router";
import { createApiTestContext } from "./helpers/api";

// ADR-0019: albums — ordered sets of Media Library stills, grouped by
// collection, published like projects, public only.

describe("albums and collections (ADR-0019)", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  let gateway: ReturnType<typeof createDbGateway>;
  let images: string[];
  let video: string;
  before(async () => {
    ctx = await createApiTestContext();
    gateway = createDbGateway(ctx.database.db);
    images = (await ctx.q<{ id: string }>(`select id from media where type = 'IMAGE' and width is not null order by storage_key limit 6`)).map((r) => r.id);
    video = (await ctx.q<{ id: string }>(`select id from media where type = 'VIDEO' limit 1`))[0].id;
  });
  after(() => ctx.close());

  const create = async (body: Record<string, unknown>) => {
    const response = await ctx.as("POST", "/albums", body);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.data as { id: string; slug: string };
  };
  const add = (albumId: string, body: Record<string, unknown>) => ctx.as("POST", `/albums/${albumId}/media`, body);
  const items = async (albumId: string) =>
    ((await ctx.as("GET", `/albums/${albumId}`)).body.data.items as { id: string; position: number; media: { id: string } }[]);

  test("create: slugs are unique, the related project must exist, input is strict", async () => {
    const album = await create({ title: "Hanoi at night", slug: "hanoi-at-night", collection: "Cities" });
    assert.equal((await ctx.as("POST", "/albums", { title: "Again", slug: "hanoi-at-night" })).status, 409);
    assert.equal((await ctx.as("POST", "/albums", { title: "Bad", slug: "Not A Slug" })).status, 422);
    assert.equal((await ctx.as("POST", "/albums", { title: "X", slug: "x-album", projectId: "00000000-0000-4000-8000-000000000000" })).status, 422);
    assert.equal((await ctx.as("POST", "/albums", { title: "X", slug: "x-album", colour: "red" })).status, 422);
    const detail = (await ctx.as("GET", `/albums/${album.id}`)).body.data;
    assert.deepEqual([detail.status, detail.collection, detail.items.length, detail.publication.isPublished], ["DRAFT", "Cities", 0, false]);
  });

  test("images: appended, inserted with a shift, bounded, stills only, once each", async () => {
    const album = await create({ title: "Stills", slug: "stills-one" });
    assert.equal((await add(album.id, { mediaId: images[0] })).status, 201);
    assert.equal((await add(album.id, { mediaId: images[1] })).status, 201);
    assert.equal((await add(album.id, { mediaId: images[2], position: 0 })).status, 201);
    let list = await items(album.id);
    assert.deepEqual(list.map((i) => i.media.id), [images[2], images[0], images[1]]);
    assert.deepEqual(list.map((i) => i.position), [0, 1, 2]);
    // Beyond the end is an error, not an append, and commits nothing.
    const refused = await add(album.id, { mediaId: images[3], position: 4 });
    assert.equal(refused.status, 422);
    assert.equal((await items(album.id)).length, 3);
    assert.equal((await add(album.id, { mediaId: video })).status, 422, "stills only");
    const again = await add(album.id, { mediaId: images[0] });
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, "ALBUM_MEDIA_DUPLICATE");
    // Removing closes the gap.
    assert.equal((await ctx.as("DELETE", `/albums/${album.id}/media/${list[1].id}`)).status, 204);
    list = await items(album.id);
    assert.deepEqual(list.map((i) => i.position), [0, 1]);
  });

  test("reorder: one request with the complete set; anything else changes nothing", async () => {
    const album = await create({ title: "Order", slug: "order-album" });
    for (const id of images.slice(0, 3)) await add(album.id, { mediaId: id });
    const list = await items(album.id);
    const reversed = [...list].reverse().map((i) => i.id);
    assert.equal((await ctx.as("PUT", `/albums/${album.id}/media/order`, { albumMediaIds: reversed })).status, 204);
    assert.deepEqual((await items(album.id)).map((i) => i.id), reversed);
    const partial = await ctx.as("PUT", `/albums/${album.id}/media/order`, { albumMediaIds: reversed.slice(1) });
    assert.equal(partial.status, 409);
    assert.equal(partial.body.error.code, "REORDER_SET_MISMATCH");
    assert.deepEqual((await items(album.id)).map((i) => i.id), reversed);
  });

  test("publish: refused when empty; the site shows only the published version", async () => {
    const album = await create({ title: "Published", slug: "published-album", collection: "Cities", description: "Night work." });
    const empty = await ctx.as("POST", `/albums/${album.id}/publish`);
    assert.equal(empty.status, 422);
    assert.equal(empty.body.error.code, "ALBUM_NOT_PUBLISHABLE");
    assert.equal(await gateway.getAlbumPage("published-album"), null);

    const first = await add(album.id, { mediaId: images[0], caption: "First light" });
    await add(album.id, { mediaId: images[1] });
    const published = await ctx.as("POST", `/albums/${album.id}/publish`);
    assert.equal(published.status, 200, JSON.stringify(published.body));
    assert.equal(published.body.data.publication.hasUnpublishedChanges, false);
    const page = (await gateway.getAlbumPage("published-album"))!;
    assert.deepEqual([page.title, page.description, page.collection, page.items.length], ["Published", "Night work.", "Cities", 2]);
    assert.equal(page.items[0].caption, "First light");
    assert.equal(page.related, null);

    // An unpublished edit is only a draft.
    await ctx.as("PATCH", `/albums/${album.id}/media/${first.body.data.id}`, { caption: "Dawn" });
    assert.equal((await ctx.as("GET", `/albums/${album.id}`)).body.data.publication.hasUnpublishedChanges, true);
    assert.equal((await gateway.getAlbumPage("published-album"))!.items[0].caption, "First light");
    assert.equal((await gateway.previewAlbumPage("published-album")).value!.items[0].caption, "Dawn");
    await ctx.as("POST", `/albums/${album.id}/publish`);
    assert.equal((await gateway.getAlbumPage("published-album"))!.items[0].caption, "Dawn");
  });

  test("collections group the index in display order; reorder and delete keep order contiguous", async () => {
    const other = await create({ title: "Elsewhere", slug: "elsewhere", collection: "Travel" });
    await add(other.id, { mediaId: images[3] });
    await ctx.as("POST", `/albums/${other.id}/publish`);
    const index = await gateway.getAlbumsIndex();
    assert.deepEqual(index.collections.map((c) => [c.name, c.albums.map((a) => a.slug)]), [
      ["Cities", ["published-album"]],
      ["Travel", ["elsewhere"]],
    ]);
    const list = (await ctx.as("GET", "/albums")).body.data as { id: string; displayPosition: number }[];
    assert.deepEqual(list.map((a) => a.displayPosition), list.map((_, i) => i));
    const reversed = [...list].reverse().map((a) => a.id);
    assert.equal((await ctx.as("PUT", "/albums/order", { albumIds: reversed })).status, 204);
    assert.deepEqual((await gateway.getAlbumsIndex()).collections.map((c) => c.name), ["Travel", "Cities"]);
    assert.equal((await ctx.as("PUT", "/albums/order", { albumIds: reversed.slice(1) })).status, 409);
    assert.equal((await ctx.as("DELETE", `/albums/${other.id}`)).status, 204);
    const after = (await ctx.as("GET", "/albums")).body.data as { displayPosition: number }[];
    assert.deepEqual(after.map((a) => a.displayPosition), after.map((_, i) => i));
    assert.equal(await gateway.getAlbumPage("elsewhere"), null);
  });

  test("the related project links only while it is published and public", async () => {
    const [court] = await ctx.q<{ id: string }>(`select id from projects where slug = 'court'`);
    const album = await create({ title: "Court stills", slug: "court-stills", projectId: court.id });
    await add(album.id, { mediaId: images[4] });
    await ctx.as("POST", `/albums/${album.id}/publish`);
    assert.deepEqual((await gateway.getAlbumPage("court-stills"))!.related, { slug: "court", title: "Court" });
    // A private project is never named (ADR-0003).
    await ctx.as("PUT", `/projects/${court.id}/password`, { password: "a long enough password" });
    await ctx.as("PATCH", `/projects/${court.id}`, { visibility: "PRIVATE" });
    assert.equal((await gateway.getAlbumPage("court-stills"))!.related, null);
    await ctx.as("PATCH", `/projects/${court.id}`, { visibility: "PUBLIC" });
  });

  test("an image in an album, its cover or its live version cannot be deleted", async () => {
    const album = await create({ title: "In use", slug: "in-use" });
    const placed = await add(album.id, { mediaId: images[5] });
    await ctx.as("PATCH", `/albums/${album.id}`, { coverMediaId: images[5] });
    const kinds = async () => ((await ctx.as("GET", `/media/${images[5]}/usages`)).body.data as { kind: string }[]).map((u) => u.kind).sort();
    assert.deepEqual((await kinds()).filter((k) => k.startsWith("ALBUM")), ["ALBUM_COVER", "ALBUM_ITEM"]);
    await ctx.as("POST", `/albums/${album.id}/publish`);
    await ctx.as("DELETE", `/albums/${album.id}/media/${placed.body.data.id}`);
    await ctx.as("PATCH", `/albums/${album.id}`, { coverMediaId: null });
    assert.deepEqual((await kinds()).filter((k) => k.includes("ALBUM")), ["PUBLISHED_ALBUM"]);
    assert.equal((await ctx.as("DELETE", `/media/${images[5]}`)).status, 409);
    await ctx.as("POST", `/albums/${album.id}/unpublish`);
    assert.deepEqual((await kinds()).filter((k) => k.includes("ALBUM")), []);
  });

  test("a private original cannot appear in a (public) album", async () => {
    const [row] = await ctx.q<{ id: string }>(
      `insert into media (type, status, storage_provider, storage_key, mime_type, width, height)
       values ('IMAGE', 'READY', 'local', 'private/originals/x/secret.jpg', 'image/jpeg', 1600, 900) returning id`,
    );
    const album = await create({ title: "Leak", slug: "leak-album" });
    await add(album.id, { mediaId: row.id });
    const refused = await ctx.as("POST", `/albums/${album.id}/publish`);
    assert.equal(refused.status, 422);
    assert.match(JSON.stringify(refused.body), /private storage/);
  });

  test("the proxy routes only published album slugs", async () => {
    let lookups = 0;
    const router = createAlbumRouter({
      listPublicAlbumSlugs: async () => ["known"],
      findAlbumRoute: async (slug) => {
        lookups += 1;
        return slug === "fresh";
      },
    });
    assert.equal(await router.route("known"), "public");
    assert.equal(await router.route("fresh"), "public", "published a moment ago");
    assert.equal(await router.route("missing"), "unknown");
    assert.equal(await router.route("../etc"), "unknown");
    assert.equal(lookups, 2, "malformed slugs never reach the database");
    assert.equal(await gateway.findAlbumRoute("published-album"), true);
    assert.equal(await gateway.findAlbumRoute("in-use"), false);
  });
});
