import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { setMediaStorageForTesting, type MediaStorage } from "@/lib/storage/media-storage";
import { createApiTestContext } from "./helpers/api";

type Context = Awaited<ReturnType<typeof createApiTestContext>>;

const positions = async (ctx: Context, where: string, table = "project_blocks") =>
  (await ctx.q<{ position: number }>(`select position from ${table} where ${where} order by position`)).map(
    (r) => r.position,
  );

describe("projects (CLAUDE.md §6, §7, §17.4, §17.6, §17.11)", () => {
  let ctx: Context;
  before(async () => {
    ctx = await createApiTestContext();
  });
  after(() => ctx.close());

  test("lists non-deleted projects in display order, with no password hash anywhere", async () => {
    const list = await ctx.as("GET", "/projects?pageSize=100");
    assert.equal(list.status, 200);
    assert.equal(list.body.meta.total, 9);
    assert.deepEqual(
      list.body.data.map((p: { displayPosition: number }) => p.displayPosition),
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.equal(list.body.data[0].slug, "made-to-measure");
    assert.ok(list.body.data[0].cover.deliveryUrl.startsWith("/media/"));
    assert.ok(!JSON.stringify(list.body).match(/passwordHash|argon2/));
    assert.equal((await ctx.as("GET", "/projects?pageSize=500")).status, 422);
  });

  test("creates a draft at the end of the order; slugs are unique", async () => {
    const created = await ctx.as("POST", "/projects", { title: "New film", slug: "new-film", year: 2026 });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "DRAFT");
    assert.equal(created.body.data.displayPosition, 9);
    assert.deepEqual(created.body.data.blocks, []);
    const again = await ctx.as("POST", "/projects", { title: "Other", slug: "new-film" });
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, "SLUG_TAKEN");
    const bad = await ctx.as("POST", "/projects", { title: "Other", slug: "Not A Slug" });
    assert.equal(bad.status, 422);
    assert.equal(bad.body.error.code, "VALIDATION_ERROR");
    assert.ok(bad.body.error.details.issues.some((i: { path: string }) => i.path === "slug"));
  });

  test("ordering fields are not writable through PATCH (ADR-0002, §17.11)", async () => {
    const [{ id }] = await ctx.q<{ id: string }>("select id from projects where slug = 'new-film'");
    for (const field of ["displayPosition", "featuredPosition"]) {
      const response = await ctx.as("PATCH", `/projects/${id}`, { [field]: 0 });
      assert.equal(response.status, 422, field);
    }
    const ok = await ctx.as("PATCH", `/projects/${id}`, { runtime: "4:10", client: "" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.runtime, "4:10");
    assert.equal(ok.body.data.client, null);
  });

  test("covers must be ready images and previews ready videos", async () => {
    const [{ id }] = await ctx.q<{ id: string }>("select id from projects where slug = 'new-film'");
    const [video] = await ctx.q<{ id: string }>("select id from media where type = 'VIDEO' limit 1");
    const [image] = await ctx.q<{ id: string }>("select id from media where type = 'IMAGE' limit 1");
    assert.equal((await ctx.as("PATCH", `/projects/${id}`, { coverMediaId: video.id })).status, 422);
    assert.equal((await ctx.as("PATCH", `/projects/${id}`, { previewMediaId: image.id })).status, 422);
    const ok = await ctx.as("PATCH", `/projects/${id}`, { coverMediaId: image.id, previewMediaId: video.id });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.cover.id, image.id);
  });

  test("a PRIVATE project always has a password, and the hash never leaves the server (§17.4)", async () => {
    const [{ id }] = await ctx.q<{ id: string }>("select id from projects where slug = 'new-film'");
    const early = await ctx.as("PATCH", `/projects/${id}`, { visibility: "PRIVATE" });
    assert.equal(early.status, 409);
    assert.equal(early.body.error.code, "PROJECT_PASSWORD_REQUIRED");
    assert.equal((await ctx.as("PUT", `/projects/${id}/password`, { password: "short" })).status, 422);
    assert.equal((await ctx.as("PUT", `/projects/${id}/password`, { password: "rehearsal-cut-2026" })).status, 204);
    const privateProject = await ctx.as("PATCH", `/projects/${id}`, { visibility: "PRIVATE" });
    assert.equal(privateProject.status, 200);
    assert.equal(privateProject.body.data.hasPassword, true);
    assert.ok(!JSON.stringify(privateProject.body).match(/argon2|passwordHash/));
    const remove = await ctx.as("DELETE", `/projects/${id}/password`);
    assert.equal(remove.status, 409);
    const createdPrivate = await ctx.as("POST", "/projects", { title: "Locked", slug: "locked", visibility: "PRIVATE" });
    assert.equal(createdPrivate.status, 422);
  });

  test("reordering is one transaction over the complete set, contiguous from 0 (§17.6)", async () => {
    const ids = (await ctx.q<{ id: string }>("select id from projects where deleted_at is null order by display_position")).map((r) => r.id);
    const partial = await ctx.as("PUT", "/projects/order", { projectIds: ids.slice(1) });
    assert.equal(partial.status, 409);
    assert.equal(partial.body.error.code, "REORDER_SET_MISMATCH");
    const reversed = [...ids].reverse();
    assert.equal((await ctx.as("PUT", "/projects/order", { projectIds: reversed })).status, 204);
    const after = (await ctx.q<{ id: string; display_position: number }>(
      "select id, display_position from projects where deleted_at is null order by display_position",
    ));
    assert.deepEqual(after.map((r) => r.id), reversed);
    assert.deepEqual(after.map((r) => r.display_position), ids.map((_, i) => i));
    await ctx.as("PUT", "/projects/order", { projectIds: ids });
  });

  test("featured order: toggling appends, the reorder takes exactly the featured set", async () => {
    const ids = (await ctx.q<{ id: string }>("select id from projects where deleted_at is null order by display_position limit 3")).map((r) => r.id);
    for (const id of ids) assert.equal((await ctx.as("PATCH", `/projects/${id}`, { isFeatured: true })).status, 200);
    assert.deepEqual(await positions(ctx, "is_featured", "(select featured_position as position, is_featured from projects) p"), [0, 1, 2]);
    assert.equal((await ctx.as("PUT", "/projects/featured/order", { projectIds: ids.slice(0, 2) })).status, 409);
    assert.equal((await ctx.as("PUT", "/projects/featured/order", { projectIds: [...ids].reverse() })).status, 204);
    await ctx.as("PATCH", `/projects/${ids[1]}`, { isFeatured: false });
    const featured = await ctx.q<{ id: string; featured_position: number }>(
      "select id, featured_position from projects where is_featured order by featured_position",
    );
    assert.deepEqual(featured.map((r) => r.id), [ids[2], ids[0]]);
    assert.deepEqual(featured.map((r) => r.featured_position), [0, 1]);
  });

  test("soft delete archives, leaves the orders contiguous and keeps media", async () => {
    const [{ id }] = await ctx.q<{ id: string }>("select id from projects where slug = 'court'");
    const media = (await ctx.q("select count(*)::int as n from media where deleted_at is null"))[0].n;
    assert.equal((await ctx.as("DELETE", `/projects/${id}`)).status, 204);
    assert.equal((await ctx.as("GET", `/projects/${id}`)).status, 404);
    const [row] = await ctx.q<{ status: string }>(`select status from projects where id = '${id}'`);
    assert.equal(row.status, "ARCHIVED");
    assert.deepEqual(
      await positions(ctx, "deleted_at is null", "(select display_position as position, deleted_at from projects) p"),
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.equal((await ctx.q("select count(*)::int as n from media where deleted_at is null"))[0].n, media);
    // The slug stays reserved.
    assert.equal((await ctx.as("POST", "/projects", { title: "Court", slug: "court" })).status, 409);
  });

  test("a malformed id is simply not found; malformed JSON is 400", async () => {
    assert.equal((await ctx.as("GET", "/projects/not-a-uuid")).status, 404);
    const malformed = await ctx.as("POST", "/projects", "{not json");
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error.code, "MALFORMED_REQUEST");
  });
});

describe("composition (CLAUDE.md §7, §13, §14; §17.9, §17.12–17, §17.21–22, §17.26)", () => {
  let ctx: Context;
  let projectId: string;
  let imageId: string;
  let videoId: string;
  before(async () => {
    ctx = await createApiTestContext();
    projectId = (await ctx.as("POST", "/projects", { title: "Composer", slug: "composer" })).body.data.id;
    imageId = (await ctx.q<{ id: string }>("select id from media where type = 'IMAGE' order by storage_key limit 1"))[0].id;
    videoId = (await ctx.q<{ id: string }>("select id from media where type = 'VIDEO' order by storage_key limit 1"))[0].id;
  });
  after(() => ctx.close());

  const rootPositions = () => positions(ctx, `project_id = '${projectId}'`);
  const text = (words: string) => ({ type: "TEXT", content: { kind: "richText", paragraphs: [[words]] } });

  test("omitted position appends; an in-range position inserts and shifts right (§17.12)", async () => {
    const a = await ctx.as("POST", `/projects/${projectId}/blocks`, text("a"));
    const b = await ctx.as("POST", `/projects/${projectId}/blocks`, text("b"));
    assert.equal(a.status, 201);
    assert.deepEqual([a.body.data.position, b.body.data.position], [0, 1]);
    const first = await ctx.as("POST", `/projects/${projectId}/blocks`, { ...text("first"), position: 0 });
    assert.equal(first.body.data.position, 0);
    const middle = await ctx.as("POST", `/projects/${projectId}/blocks`, { ...text("middle"), position: 2 });
    assert.equal(middle.body.data.position, 2);
    assert.deepEqual(await rootPositions(), [0, 1, 2, 3]);
    const order = (await ctx.q<{ content: { paragraphs: string[][] } }>(
      `select content from project_blocks where project_id = '${projectId}' order by position`,
    )).map((r) => r.content.paragraphs[0][0]);
    assert.deepEqual(order, ["first", "a", "middle", "b"]);
  });

  test("a position beyond the end or below 0 is 422 and commits nothing (§17.13)", async () => {
    const before = await rootPositions();
    const beyond = await ctx.as("POST", `/projects/${projectId}/blocks`, { ...text("x"), position: before.length + 1 });
    assert.equal(beyond.status, 422);
    assert.equal(beyond.body.error.code, "VALIDATION_ERROR");
    assert.equal((await ctx.as("POST", `/projects/${projectId}/blocks`, { ...text("x"), position: -1 })).status, 422);
    assert.deepEqual(await rootPositions(), before);
  });

  test("block content and config are validated by type, strictly", async () => {
    const cases: [unknown, RegExp][] = [
      [{ type: "TEXT", content: { kind: "richText", paragraphs: [["x"]] }, config: { color: "#c4361c" } }, /color/],
      [{ type: "VIDEO", config: { playback: { mode: "AUTOPLAY_VISIBLE", muted: true } } }, /muted/],
      [{ type: "VIDEO", config: { playback: { mode: "AUTOPLAY_VISIBLE", controls: true } } }, /controls/],
      [{ type: "HERO", config: { overlay: { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true, title: "X" } } }, /title/],
      [{ type: "HERO", config: { playback: { mode: "AUTOPLAY_AMBIENT" }, overlay: { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true } } }, /overlay/],
      [{ type: "GALLERY", config: { mode: "VIDEO_GRID", columns: { desktop: 2, tablet: 3, mobile: 1 }, playback: { mode: "AUTOPLAY_VISIBLE" } } }, /narrower/],
      [{ type: "GALLERY", config: { mode: "VIDEO_GRID", columns: { desktop: 3, tablet: 2, mobile: 1 }, playback: { mode: "AUTOPLAY_AMBIENT" } } }, /mode/],
    ];
    for (const [body, pattern] of cases) {
      const response = await ctx.as("POST", `/projects/${projectId}/blocks`, body);
      assert.equal(response.status, 422, JSON.stringify(body));
      assert.match(JSON.stringify(response.body.error.details), pattern);
    }
  });

  test("GRID children: leaf only, one level, placement within 12 columns (§17.14, §17.16, §17.26)", async () => {
    const grid = await ctx.as("POST", `/projects/${projectId}/blocks`, { type: "GRID" });
    const parentBlockId = grid.body.data.id;
    const child = (body: object) => ctx.as("POST", `/projects/${projectId}/blocks`, { ...body, parentBlockId });
    assert.equal((await child({ type: "GRID" })).status, 422);
    assert.equal((await child({ type: "GALLERY", config: { mode: "JUSTIFIED_ROWS" } })).status, 422);
    const tooWide = await child({ type: "IMAGE", config: { placement: { desktop: { colStart: 9, colSpan: 5 } } } });
    assert.equal(tooWide.status, 422);
    assert.match(JSON.stringify(tooWide.body), /13/);
    const ambient = await child({ type: "VIDEO", config: { playback: { mode: "AUTOPLAY_AMBIENT" } } });
    assert.equal(ambient.status, 422);
    const ok = await child({ type: "IMAGE", config: { placement: { desktop: { colStart: 9, colSpan: 4 } } } });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.data.parentBlockId, parentBlockId);
    assert.equal(ok.body.data.position, 0);
    // A child of a GRID cannot itself be a parent.
    const nested = await ctx.as("POST", `/projects/${projectId}/blocks`, { ...text("x"), parentBlockId: ok.body.data.id });
    assert.equal(nested.status, 422);
    // Positions are per container: the child's 0 does not collide with root 0.
    assert.deepEqual(await positions(ctx, `parent_block_id = '${parentBlockId}'`), [0]);
  });

  test("media placement follows the block's rules", async () => {
    const image = await ctx.as("POST", `/projects/${projectId}/blocks`, { type: "IMAGE" });
    const blockId = image.body.data.id;
    const wrong = await ctx.as("POST", `/blocks/${blockId}/media`, { mediaId: videoId });
    assert.equal(wrong.status, 422);
    assert.equal(wrong.body.error.code, "INVALID_MEDIA_FOR_BLOCK");
    const placed = await ctx.as("POST", `/blocks/${blockId}/media`, { mediaId: imageId, altText: "" });
    assert.equal(placed.status, 201);
    assert.equal(placed.body.data.altText, "");
    assert.equal(placed.body.data.media.id, imageId);
    const second = await ctx.as("POST", `/blocks/${blockId}/media`, { mediaId: imageId });
    assert.equal(second.status, 422);
    const text = await ctx.q<{ id: string }>(`select id from project_blocks where project_id = '${projectId}' and type = 'TEXT' limit 1`);
    assert.equal((await ctx.as("POST", `/blocks/${text[0].id}/media`, { mediaId: imageId })).status, 422);
  });

  test("external video supports CLICK_TO_PLAY only (§17.22)", async () => {
    const external = await ctx.as("POST", "/media/external", { provider: "vimeo", url: "https://vimeo.com/123456" });
    assert.equal(external.status, 201);
    assert.equal(external.body.data.deliveryUrl, null);
    const bad = await ctx.as("POST", "/media/external", { provider: "vimeo", url: "https://evil.example/vimeo.com" });
    assert.equal(bad.status, 422);
    const autoplay = await ctx.as("POST", `/projects/${projectId}/blocks`, {
      type: "VIDEO",
      config: { playback: { mode: "AUTOPLAY_VISIBLE" } },
    });
    const refused = await ctx.as("POST", `/blocks/${autoplay.body.data.id}/media`, { mediaId: external.body.data.id });
    assert.equal(refused.status, 422);
    assert.match(JSON.stringify(refused.body), /CLICK_TO_PLAY/);
    const film = await ctx.as("POST", `/projects/${projectId}/blocks`, {
      type: "VIDEO",
      config: { playback: { mode: "CLICK_TO_PLAY", controls: true } },
    });
    const accepted = await ctx.as("POST", `/blocks/${film.body.data.id}/media`, { mediaId: external.body.data.id });
    assert.equal(accepted.status, 201);
    // Switching that block to autoplay is refused while the external video is placed.
    const flip = await ctx.as("PATCH", `/blocks/${film.body.data.id}`, { config: { playback: { mode: "AUTOPLAY_VISIBLE" } } });
    assert.equal(flip.status, 422);
  });

  test("gallery media: insert at a position, reorder the complete set, remove closes the gap", async () => {
    const gallery = await ctx.as("POST", `/projects/${projectId}/blocks`, { type: "GALLERY", config: { mode: "JUSTIFIED_ROWS" } });
    const blockId = gallery.body.data.id;
    const images = (await ctx.q<{ id: string }>("select id from media where type = 'IMAGE' order by storage_key limit 3")).map((r) => r.id);
    for (const mediaId of images) await ctx.as("POST", `/blocks/${blockId}/media`, { mediaId });
    const inserted = await ctx.as("POST", `/blocks/${blockId}/media`, { mediaId: videoId, position: 1 });
    assert.equal(inserted.status, 201);
    assert.equal((await ctx.as("POST", `/blocks/${blockId}/media`, { mediaId: videoId, position: 9 })).status, 422);
    const items = await ctx.q<{ id: string; media_id: string }>(`select id, media_id from block_media where block_id = '${blockId}' order by position`);
    assert.deepEqual(items.map((r) => r.media_id), [images[0], videoId, images[1], images[2]]);
    assert.equal((await ctx.as("PUT", `/blocks/${blockId}/media/order`, { blockMediaIds: items.slice(1).map((r) => r.id) })).status, 409);
    const reversed = items.map((r) => r.id).reverse();
    assert.equal((await ctx.as("PUT", `/blocks/${blockId}/media/order`, { blockMediaIds: reversed })).status, 204);
    assert.equal((await ctx.as("DELETE", `/blocks/${blockId}/media/${reversed[0]}`)).status, 204);
    assert.deepEqual(await positions(ctx, `block_id = '${blockId}'`, "block_media"), [0, 1, 2]);
  });

  test("placement alt and poster overrides (ADR-0011, ADR-0015)", async () => {
    const video = await ctx.as("POST", `/projects/${projectId}/blocks`, { type: "VIDEO", config: { playback: { mode: "CLICK_TO_PLAY" } } });
    const placed = await ctx.as("POST", `/blocks/${video.body.data.id}/media`, { mediaId: videoId });
    const path = `/blocks/${video.body.data.id}/media/${placed.body.data.id}`;
    assert.equal((await ctx.as("PATCH", path, { posterMediaId: videoId })).status, 422);
    const withPoster = await ctx.as("PATCH", path, { posterMediaId: imageId, altText: "The table, from above" });
    assert.equal(withPoster.status, 200);
    assert.equal(withPoster.body.data.poster.id, imageId);
    assert.equal(withPoster.body.data.altText, "The table, from above");
    const image = await ctx.as("POST", `/projects/${projectId}/blocks`, { type: "IMAGE" });
    const imagePlaced = await ctx.as("POST", `/blocks/${image.body.data.id}/media`, { mediaId: imageId });
    const posterOnImage = await ctx.as("PATCH", `/blocks/${image.body.data.id}/media/${imagePlaced.body.data.id}`, { posterMediaId: imageId });
    assert.equal(posterOnImage.status, 422);
    assert.equal(posterOnImage.body.error.code, "INVALID_POSTER");
  });

  test("root reorder takes the complete container; a child container reorders on its own", async () => {
    const roots = (await ctx.q<{ id: string }>(`select id from project_blocks where project_id = '${projectId}' order by position`)).map((r) => r.id);
    assert.equal((await ctx.as("PUT", `/projects/${projectId}/blocks/order`, { parentBlockId: null, blockIds: roots.slice(1) })).status, 409);
    const reversed = [...roots].reverse();
    assert.equal((await ctx.as("PUT", `/projects/${projectId}/blocks/order`, { parentBlockId: null, blockIds: reversed })).status, 204);
    assert.deepEqual(
      (await ctx.q<{ id: string }>(`select id from project_blocks where project_id = '${projectId}' order by position`)).map((r) => r.id),
      reversed,
    );
    assert.deepEqual(await rootPositions(), roots.map((_, i) => i));
    // A block of another owner cannot be smuggled into this container.
    const foreign = (await ctx.q<{ id: string }>("select id from project_blocks where page_id is not null limit 1"))[0].id;
    const smuggled = await ctx.as("PUT", `/projects/${projectId}/blocks/order`, {
      parentBlockId: null,
      blockIds: [...roots.slice(1), foreign],
    });
    assert.equal(smuggled.status, 409);
  });

  test("duplicate deep-copies children and placements, never media assets (§17.17)", async () => {
    const [grid] = await ctx.q<{ id: string; position: number }>(`select id, position from project_blocks where project_id = '${projectId}' and type = 'GRID'`);
    const child = (await ctx.q<{ id: string }>(`select id from project_blocks where parent_block_id = '${grid.id}'`))[0].id;
    await ctx.as("POST", `/blocks/${child}/media`, { mediaId: imageId, altText: "Hands" });
    const mediaCount = (await ctx.q("select count(*)::int as n from media"))[0].n;
    const copy = await ctx.as("POST", `/blocks/${grid.id}/duplicate`);
    assert.equal(copy.status, 201);
    assert.equal(copy.body.data.position, grid.position + 1);
    assert.equal(copy.body.data.children.length, 1);
    assert.notEqual(copy.body.data.children[0].id, child);
    assert.equal(copy.body.data.children[0].media[0].mediaId, imageId);
    assert.equal(copy.body.data.children[0].media[0].altText, "Hands");
    assert.equal((await ctx.q("select count(*)::int as n from media"))[0].n, mediaCount);
    assert.deepEqual(await rootPositions(), [...Array((await rootPositions()).length).keys()]);
  });

  test("hide/show, and deleting a block removes placements but never assets (§17.9)", async () => {
    const [image] = await ctx.q<{ id: string }>(
      `select b.id from project_blocks b join block_media m on m.block_id = b.id where b.project_id = '${projectId}' and b.type = 'IMAGE' limit 1`,
    );
    const hidden = await ctx.as("PATCH", `/blocks/${image.id}`, { isHidden: true });
    assert.equal(hidden.status, 200);
    assert.equal(hidden.body.data.isHidden, true);
    const detail = await ctx.as("GET", `/projects/${projectId}`);
    assert.ok(detail.body.data.blocks.some((b: { id: string; isHidden: boolean }) => b.id === image.id && b.isHidden));
    const mediaBefore = (await ctx.q("select count(*)::int as n from media where deleted_at is null"))[0].n;
    assert.equal((await ctx.as("DELETE", `/blocks/${image.id}`)).status, 204);
    assert.equal((await ctx.q(`select count(*)::int as n from block_media where block_id = '${image.id}'`))[0].n, 0);
    assert.equal((await ctx.q("select count(*)::int as n from media where deleted_at is null"))[0].n, mediaBefore);
    const all = await rootPositions();
    assert.deepEqual(all, [...all.keys()]);
    assert.equal((await ctx.as("PATCH", `/blocks/${image.id}`, { isHidden: false })).status, 404);
  });

  test("Home is composed with the same blocks (ADR-0007); derived project text needs a project", async () => {
    const page = await ctx.as("GET", "/pages/HOME");
    assert.equal(page.status, 200);
    assert.equal(page.body.data.blocks.length, 5);
    assert.equal(page.body.data.blocks[2].config.preset, "homeWall");
    const facts = await ctx.as("POST", "/pages/HOME/blocks", { type: "TEXT", content: { kind: "projectFacts" } });
    assert.equal(facts.status, 422);
    assert.equal((await ctx.as("GET", "/pages/ABOUT")).status, 404);
  });
});

describe("media library (CLAUDE.md §12, §17.7, §17.27, §17.28)", () => {
  let ctx: Context;
  before(async () => {
    ctx = await createApiTestContext();
  });
  after(() => {
    setMediaStorageForTesting(undefined);
    return ctx.close();
  });

  test("lists and reads assets with derived delivery URLs and depth-1 posters", async () => {
    const list = await ctx.as("GET", "/media?type=VIDEO&pageSize=100");
    assert.equal(list.status, 200);
    assert.equal(list.body.meta.total, 7);
    const withPoster = list.body.data.find((m: { poster: unknown }) => m.poster);
    assert.ok(withPoster.deliveryUrl.startsWith("/media/"));
    assert.equal(withPoster.poster.type, "IMAGE");
    assert.equal("poster" in withPoster.poster, false);
    assert.match(withPoster.checksumSha256, /^[0-9a-f]{64}$/);
    const search = await ctx.as("GET", "/media?search=mannequin");
    assert.ok(search.body.data.length >= 1);
  });

  test("an asset in use cannot be deleted; the refusal lists its usages (§17.7, §17.27)", async () => {
    const [poster] = await ctx.q<{ id: string }>("select poster_media_id as id from media where poster_media_id is not null limit 1");
    const refused = await ctx.as("DELETE", `/media/${poster.id}`);
    assert.equal(refused.status, 409);
    assert.equal(refused.body.error.code, "MEDIA_IN_USE");
    assert.ok(refused.body.error.details.usages.some((u: { kind: string }) => u.kind === "ASSET_POSTER"));
    const usages = await ctx.as("GET", `/media/${poster.id}/usages`);
    assert.deepEqual(usages.body.data, refused.body.error.details.usages);
  });

  test("poster targets: a ready image, never the asset itself (§17.28)", async () => {
    const [video] = await ctx.q<{ id: string }>("select id from media where type = 'VIDEO' limit 1");
    const [image] = await ctx.q<{ id: string }>("select id from media where type = 'IMAGE' limit 1");
    const [otherVideo] = await ctx.q<{ id: string }>(`select id from media where type = 'VIDEO' and id <> '${video.id}' limit 1`);
    for (const posterMediaId of [video.id, otherVideo.id]) {
      const response = await ctx.as("PATCH", `/media/${video.id}`, { posterMediaId });
      assert.equal(response.status, 422);
      assert.equal(response.body.error.code, "INVALID_POSTER");
    }
    assert.equal((await ctx.as("PATCH", `/media/${image.id}`, { posterMediaId: image.id })).status, 422);
    const ok = await ctx.as("PATCH", `/media/${video.id}`, { posterMediaId: image.id, altText: "A clip" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.poster.id, image.id);
  });

  test("an unused asset can be soft-deleted, once", async () => {
    const external = await ctx.as("POST", "/media/external", { provider: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" });
    const id = external.body.data.id;
    assert.deepEqual((await ctx.as("GET", `/media/${id}/usages`)).body.data, []);
    assert.equal((await ctx.as("DELETE", `/media/${id}`)).status, 204);
    assert.equal((await ctx.as("GET", `/media/${id}`)).status, 404);
    assert.equal((await ctx.as("DELETE", `/media/${id}`)).status, 404);
  });

  test("without a storage provider, an upload is refused honestly and creates nothing", async () => {
    const before = (await ctx.q("select count(*)::int as n from media"))[0].n;
    const response = await ctx.as("POST", "/media/uploads", { filename: "take-3.mp4", mimeType: "video/mp4", fileSizeBytes: 1000 });
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, "STORAGE_UNAVAILABLE");
    assert.equal((await ctx.q("select count(*)::int as n from media"))[0].n, before);
    assert.equal((await ctx.as("POST", "/media/uploads", { filename: "a.exe", mimeType: "application/x-msdownload", fileSizeBytes: 10 })).status, 422);
    const huge = await ctx.as("POST", "/media/uploads", { filename: "a.jpg", mimeType: "image/jpeg", fileSizeBytes: 60 * 1024 * 1024 });
    assert.equal(huge.status, 413);
  });

  test("with a provider, the direct-upload flow authorises, verifies and de-duplicates", async () => {
    const objects = new Map<string, { byteSize: number; checksumSha256: string }>();
    const fake: MediaStorage = {
      provider: "fake",
      publicUrl: (key) => `https://cdn.test/${key}`,
      signedDeliveryUrl: (key) => `https://private.test/${key}?signed`,
      localPath: () => null,
      createUpload: async ({ key }) => ({ url: `https://upload.test/${key}`, method: "PUT", headers: {}, expiresAt: new Date(Date.now() + 60000) }),
      verifyUpload: async (key) => (objects.has(key) ? { key, ...objects.get(key)! } : null),
      deleteObject: async () => {},
    };
    setMediaStorageForTesting(fake);
    const created = await ctx.as("POST", "/media/uploads", { filename: "Still 01.JPG", mimeType: "image/jpeg", fileSizeBytes: 1234 });
    assert.equal(created.status, 201);
    const { mediaId, uploadUrl } = created.body.data;
    assert.match(uploadUrl, new RegExp(`originals/${mediaId}/still-01.jpg$`));
    assert.equal((await ctx.as("POST", `/media/${mediaId}/complete`)).status, 409);
    objects.set(`originals/${mediaId}/still-01.jpg`, { byteSize: 1234, checksumSha256: "f".repeat(64) });
    const done = await ctx.as("POST", `/media/${mediaId}/complete`);
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, "READY");
    assert.equal(done.body.data.deliveryUrl, `https://cdn.test/originals/${mediaId}/still-01.jpg`);
    const duplicate = await ctx.as("POST", "/media/uploads", {
      filename: "copy.jpg",
      mimeType: "image/jpeg",
      fileSizeBytes: 1234,
      checksumSha256: "f".repeat(64),
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "MEDIA_DUPLICATE");
    assert.equal(duplicate.body.error.details.mediaId, mediaId);
    setMediaStorageForTesting(undefined);
  });
});
