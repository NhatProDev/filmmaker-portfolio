import "./helpers/access-secret";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createS3MediaStorage, setMediaStorageForTesting } from "@/lib/storage/media-storage";
import { api, createApiTestContext } from "./helpers/api";

// Phase 3B: the Studio previews private media through an admin-only route that
// answers with a short-lived signed URL. Private originals never become public.

describe("private media previews in the Studio (Phase 3B)", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  let privateImage: string;
  let uploading: string;
  let external: string;
  before(async () => {
    ctx = await createApiTestContext();
    setMediaStorageForTesting(
      createS3MediaStorage({
        endpoint: "https://acct.r2.cloudflarestorage.com",
        region: "auto",
        publicBucket: "pub",
        privateBucket: "priv",
        accessKeyId: "id",
        secretAccessKey: "secret",
        pathStyle: true,
        publicBaseUrl: "https://media.example.com",
        uploadTtlSeconds: 600,
      }),
    );
    const insert = async (key: string, status: string) =>
      (
        await ctx.q<{ id: string }>(
          `insert into media (type, status, storage_provider, storage_key, mime_type, width, height)
           values ('IMAGE', '${status}', 's3', '${key}', 'image/jpeg', 1600, 900) returning id`,
        )
      )[0].id;
    privateImage = await insert("private/projects/client/still.jpg", "READY");
    uploading = await insert("private/projects/client/pending.jpg", "UPLOADING");
    external = (await ctx.as("POST", "/media/external", { provider: "vimeo", url: "https://vimeo.com/76979871" })).body.data.id;
  });
  after(async () => {
    setMediaStorageForTesting(undefined);
    await ctx.close();
  });

  test("the DTO still carries no public URL for a private asset", async () => {
    const dto = (await ctx.as("GET", `/media/${privateImage}`)).body.data;
    assert.equal(dto.deliveryUrl, null);
  });

  test("an admin gets a short-lived signed URL on the private bucket, never cached", async () => {
    const response = await ctx.as("GET", `/media/${privateImage}/content`);
    assert.equal(response.status, 302);
    const location = response.headers.get("location")!;
    assert.match(location, /^https:\/\/acct\.r2\.cloudflarestorage\.com\/priv\/private\/projects\/client\/still\.jpg\?/);
    assert.match(location, /X-Amz-Expires=\d+&/);
    assert.match(location, /X-Amz-Signature=[0-9a-f]{64}$/);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
  });

  test("without an admin session there is nothing: no redirect, no URL", async () => {
    const anonymous = await api("GET", `/media/${privateImage}/content`);
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.headers.get("location"), null);
    const forged = await api("GET", `/media/${privateImage}/content`, { cookie: "portfolio_admin_session=forged" });
    assert.equal(forged.status, 401);
  });

  test("only ready stored assets: not uploading, external, deleted or unknown", async () => {
    assert.equal((await ctx.as("GET", `/media/${uploading}/content`)).status, 404);
    assert.equal((await ctx.as("GET", `/media/${external}/content`)).status, 404);
    assert.equal((await ctx.as("GET", "/media/00000000-0000-4000-8000-000000000000/content")).status, 404);
    await ctx.q(`update media set deleted_at = now() where id = '${privateImage}'`);
    assert.equal((await ctx.as("GET", `/media/${privateImage}/content`)).status, 404);
    await ctx.q(`update media set deleted_at = null where id = '${privateImage}'`);
  });

  test("the public private-media route still refuses a visitor without project access", async () => {
    const response = await api("GET", `/public/projects/made-to-measure/media/${privateImage}`);
    assert.equal(response.status, 404);
  });
});
