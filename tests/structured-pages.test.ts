import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { createDbGateway } from "@/features/site-content/db-gateway";
import { staticGateway } from "@/features/site-content/static-gateway";
import { mediaKeyFromUrl } from "@/lib/storage/media-url";
import { importContentPages } from "../scripts/lib/page-content-import";
import { createApiTestContext } from "./helpers/api";

// ADR-0017: About, Contact and the site settings as structured pages. The
// locked pages must render exactly as before: from the committed content until
// each page is published, and from its snapshot afterwards.

const MEDIA_ROOT = resolve("public/media");
const sha = (src: string) => createHash("sha256").update(readFileSync(join(MEDIA_ROOT, mediaKeyFromUrl(src)!))).digest("hex");

// Two images are the same picture when their bytes are the same; the key may
// differ (a Media Library asset shared with another page).
function sameImages<T>(a: T, b: T) {
  const srcs: [string, string][] = [];
  const strip = (value: unknown, into: string[]): unknown => {
    if (Array.isArray(value)) return value.map((v) => strip(v, into));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => {
          if (k === "src" && typeof v === "string") {
            into.push(v);
            return [k, "(image)"];
          }
          return [k, strip(v, into)];
        }),
      );
    }
    return value;
  };
  const left: string[] = [];
  const right: string[] = [];
  assert.deepEqual(strip(a, left), strip(b, right));
  left.forEach((src, i) => srcs.push([src, right[i]]));
  for (const [x, y] of srcs) assert.equal(sha(x), sha(y), `${x} and ${y} are the same bytes`);
}

describe("structured pages: About, Contact and site settings (ADR-0017)", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  let gateway: ReturnType<typeof createDbGateway>;
  before(async () => {
    ctx = await createApiTestContext();
    gateway = createDbGateway(ctx.database.db);
  });
  after(() => ctx.close());

  test("migration seeds ABOUT, CONTACT and SITE once, with empty content", async () => {
    const rows = await ctx.q<{ key: string; content: unknown }>(`select key, content from pages order by key`);
    assert.deepEqual(rows.map((r) => r.key), ["ABOUT", "CONTACT", "HOME", "SITE"]);
    for (const row of rows) assert.deepEqual(row.content, {});
  });

  test("before any import or publish, every page renders exactly its committed content", async () => {
    assert.deepEqual(await gateway.getAbout(), await staticGateway.getAbout());
    assert.deepEqual(await gateway.getContact(), await staticGateway.getContact());
    assert.deepEqual((await gateway.getHome()).footer, (await staticGateway.getHome()).footer);
  });

  test("the import creates working copies once, reuses existing assets, and a second run changes nothing", async () => {
    const mediaBefore = (await ctx.q(`select count(*)::int as n from media`))[0];
    const first = await importContentPages(ctx.database.db, staticGateway, MEDIA_ROOT, true);
    assert.deepEqual(first.pages.map((p) => [p.key, p.action]), [["SITE", "create"], ["ABOUT", "create"], ["CONTACT", "create"]]);
    assert.deepEqual(first.mediaCreated, [], "every About and Contact still is already a Media Library asset");
    assert.deepEqual((await ctx.q(`select count(*)::int as n from media`))[0], mediaBefore);
    const second = await importContentPages(ctx.database.db, staticGateway, MEDIA_ROOT, true);
    assert.deepEqual(second.pages.map((p) => p.action), ["unchanged", "unchanged", "unchanged"]);
    // Nothing is public yet: the pages still render the committed content.
    assert.deepEqual(await gateway.getAbout(), await staticGateway.getAbout());
  });

  test("publishing each imported page renders the same pages, pictures included", async () => {
    for (const key of ["SITE", "ABOUT", "CONTACT"]) {
      const published = await ctx.as("POST", `/pages/${key}/publish`);
      assert.equal(published.status, 200, JSON.stringify(published.body));
      assert.equal(published.body.data.publication.hasUnpublishedChanges, false);
      assert.deepEqual(published.body.data.publication.issues, []);
    }
    sameImages(await gateway.getAbout(), await staticGateway.getAbout());
    sameImages(await gateway.getContact(), await staticGateway.getContact());
    assert.deepEqual((await gateway.getHome()).footer, (await staticGateway.getHome()).footer);
  });

  test("an unpublished edit changes only the preview; publishing makes it live", async () => {
    const about = (await ctx.as("GET", "/pages/ABOUT")).body.data;
    const edited = { ...about.content, lead: "A new lead, draft only." };
    const saved = await ctx.as("PATCH", "/pages/ABOUT", { content: edited });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.data.publication.hasUnpublishedChanges, true);
    assert.notEqual((await gateway.getAbout()).lead, edited.lead);
    assert.equal((await gateway.previewAbout()).value?.lead, edited.lead);
    await ctx.as("POST", "/pages/ABOUT/publish");
    assert.equal((await gateway.getAbout()).lead, edited.lead);
  });

  test("the site settings feed every page that shows them", async () => {
    const site = (await ctx.as("GET", "/pages/SITE")).body.data;
    await ctx.as("PATCH", "/pages/SITE", { content: { ...site.content, email: "studio@example.com", footerNote: "Hanoi." } });
    assert.notEqual((await gateway.getContact()).email.address, "studio@example.com", "not before publish");
    await ctx.as("POST", "/pages/SITE/publish");
    assert.equal((await gateway.getContact()).email.address, "studio@example.com");
    assert.equal((await gateway.getAbout()).contact.email, "studio@example.com");
    const home = await gateway.getHome();
    assert.deepEqual([home.footer.email, home.footer.note], ["studio@example.com", "Hanoi."]);
  });

  test("content is validated whole and strictly", async () => {
    const contact = (await ctx.as("GET", "/pages/CONTACT")).body.data.content;
    const refused = [
      { ...contact, colour: "#c4361c" },
      { ...contact, statement: "" },
      { ...contact, rows: [{ label: "Instagram", value: "@x", href: "javascript:alert(1)" }] },
      { ...contact, rows: [contact.rows[0], contact.rows[0]] },
    ];
    for (const content of refused) {
      const response = await ctx.as("PATCH", "/pages/CONTACT", { content });
      assert.equal(response.status, 422, JSON.stringify(content).slice(0, 120));
      assert.equal(response.body.error.code, "VALIDATION_ERROR");
    }
    // The prototype's placeholder links are accepted as they are.
    assert.equal((await ctx.as("PATCH", "/pages/CONTACT", { content: { ...contact, rows: [{ label: "Vimeo", value: "v", href: "#" }] } })).status, 200);
    // HOME is a composition and has no structured content; ABOUT owns no
    // blocks. Neither resource exists.
    assert.equal((await ctx.as("PATCH", "/pages/HOME", { content: {} })).status, 404);
    assert.equal((await ctx.as("POST", "/pages/ABOUT/blocks", { type: "SPACER", config: { size: "S" } })).status, 404);
  });

  test("slots are closed per page and hold a ready image", async () => {
    const video = (await ctx.q<{ id: string }>(`select id from media where type = 'VIDEO' limit 1`))[0].id;
    const image = (await ctx.q<{ id: string }>(`select id from media where type = 'IMAGE' limit 1`))[0].id;
    assert.equal((await ctx.as("PUT", "/pages/ABOUT/media/banner", { mediaId: image })).status, 422);
    assert.equal((await ctx.as("PUT", "/pages/SITE/media/portrait", { mediaId: image })).status, 422);
    assert.equal((await ctx.as("PUT", "/pages/ABOUT/media/portrait", { mediaId: video })).status, 422);
    const placed = await ctx.as("PUT", "/pages/ABOUT/media/process", { mediaId: image, altText: "" });
    assert.equal(placed.status, 200);
    assert.equal(placed.body.data.slots.find((s: { slot: string }) => s.slot === "process").media.id, image);
  });

  test("a page cannot publish without the images it needs; Contact's still is optional", async () => {
    await ctx.as("DELETE", "/pages/ABOUT/media/evidence");
    const refused = await ctx.as("POST", "/pages/ABOUT/publish");
    assert.equal(refused.status, 422);
    assert.equal(refused.body.error.code, "PAGE_NOT_PUBLISHABLE");
    assert.match(JSON.stringify(refused.body.error.details), /evidence: choose an image/);

    const contact = (await ctx.as("GET", "/pages/CONTACT")).body.data;
    await ctx.as("PATCH", "/pages/CONTACT", { content: { ...contact.content, identity: null } });
    await ctx.as("DELETE", "/pages/CONTACT/media/identity");
    const published = await ctx.as("POST", "/pages/CONTACT/publish");
    assert.equal(published.status, 200, JSON.stringify(published.body));
    assert.equal((await gateway.getContact()).identity, null);
  });

  test("an image in a page slot, or on a published page, cannot be deleted", async () => {
    const [slot] = await ctx.q<{ media_id: string }>(`select media_id from page_media pm join pages p on p.id = pm.page_id where p.key = 'ABOUT' and pm.slot = 'portrait'`);
    const refused = await ctx.as("DELETE", `/media/${slot.media_id}`);
    assert.equal(refused.status, 409);
    assert.equal(refused.body.error.code, "MEDIA_IN_USE");
    const usages = (await ctx.as("GET", `/media/${slot.media_id}/usages`)).body.data as { kind: string; pageKey?: string; slot?: string }[];
    assert.ok(usages.some((u) => u.kind === "PAGE_MEDIA" && u.pageKey === "ABOUT" && u.slot === "portrait"));
  });
});
