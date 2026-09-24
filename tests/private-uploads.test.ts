import "./helpers/access-secret";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createS3MediaStorage, setMediaStorageForTesting } from "@/lib/storage/media-storage";
import { createApiTestContext } from "./helpers/api";

// Phase 3C (ADR-0020): the Studio uploads private originals straight to the
// private bucket through a short-lived presigned PUT. They never gain a public
// URL, completion records what the browser measured, and duplicates are
// refused across both audiences.

describe("private uploads and upload completion (ADR-0020)", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  // Objects "in the buckets", by bucket/key path, as HEAD will report them.
  const stored = new Map<string, { size: number; type: string }>();
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const object = stored.get(decodeURIComponent(url.pathname.slice(1)));
    if ((init?.method ?? "GET") === "HEAD") {
      return object
        ? new Response(null, { status: 200, headers: { "content-length": String(object.size), "content-type": object.type } })
        : new Response(null, { status: 404 });
    }
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  before(async () => {
    ctx = await createApiTestContext();
    setMediaStorageForTesting(
      createS3MediaStorage(
        {
          endpoint: "https://acct.r2.cloudflarestorage.com",
          region: "auto",
          publicBucket: "pub",
          privateBucket: "priv",
          accessKeyId: "id",
          secretAccessKey: "secret",
          pathStyle: true,
          publicBaseUrl: "https://media.example.com",
          uploadTtlSeconds: 600,
        },
        fakeFetch,
      ),
    );
  });
  after(async () => {
    setMediaStorageForTesting(undefined);
    await ctx.close();
  });

  const sha = (c: string) => c.repeat(64);
  const authorise = async (body: Record<string, unknown>) => {
    const response = await ctx.as("POST", "/media/uploads", body);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    const { mediaId, uploadUrl } = response.body.data as { mediaId: string; uploadUrl: string };
    return { mediaId, uploadUrl: new URL(uploadUrl) };
  };
  const put = (url: URL, size: number, type: string) => stored.set(decodeURIComponent(url.pathname.slice(1)), { size, type });

  test("a PRIVATE upload is signed for the private bucket under private/ and never gets a public URL", async () => {
    const { mediaId, uploadUrl } = await authorise({ filename: "Client Cut.JPG", mimeType: "image/jpeg", fileSizeBytes: 2048, audience: "PRIVATE" });
    assert.equal(uploadUrl.host, "acct.r2.cloudflarestorage.com");
    assert.equal(uploadUrl.pathname, `/priv/private/originals/${mediaId}/client-cut.jpg`);
    assert.ok(uploadUrl.searchParams.get("X-Amz-Expires"), "a short-lived presigned PUT");
    put(uploadUrl, 2048, "image/jpeg");
    const done = await ctx.as("POST", `/media/${mediaId}/complete`, { checksumSha256: sha("a"), width: 3000, height: 2000 });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    const dto = done.body.data;
    assert.equal(dto.status, "READY");
    assert.equal(dto.isPrivate, true);
    assert.equal(dto.deliveryUrl, null);
    assert.equal(dto.storageKey, `private/originals/${mediaId}/client-cut.jpg`);
    assert.deepEqual([dto.width, dto.height, dto.checksumSha256], [3000, 2000, sha("a")]);
    // The Studio's preview is the admin-only signed route, on the private bucket.
    const preview = await ctx.as("GET", `/media/${mediaId}/content`);
    assert.equal(preview.status, 302);
    assert.match(preview.headers.get("location")!, /\/priv\/private\/originals\//);
  });

  test("a PUBLIC upload is unchanged: public bucket, public URL", async () => {
    const { mediaId, uploadUrl } = await authorise({ filename: "still.png", mimeType: "image/png", fileSizeBytes: 10 });
    assert.equal(uploadUrl.pathname, `/pub/originals/${mediaId}/still.png`);
    put(uploadUrl, 10, "image/png");
    const done = await ctx.as("POST", `/media/${mediaId}/complete`, { width: 40, height: 20 });
    assert.equal(done.body.data.isPrivate, false);
    assert.equal(done.body.data.deliveryUrl, `https://media.example.com/originals/${mediaId}/still.png`);
  });

  test("a video is READY once the browser declares its frame, PROCESSING without it", async () => {
    const measured = await authorise({ filename: "loop.mp4", mimeType: "video/mp4", fileSizeBytes: 500, audience: "PRIVATE" });
    put(measured.uploadUrl, 500, "video/mp4");
    const ready = await ctx.as("POST", `/media/${measured.mediaId}/complete`, { width: 1920, height: 1080, durationMs: 12500 });
    assert.deepEqual([ready.body.data.status, ready.body.data.durationMs], ["READY", 12500]);

    const bare = await authorise({ filename: "raw.mp4", mimeType: "video/mp4", fileSizeBytes: 600 });
    put(bare.uploadUrl, 600, "video/mp4");
    const processing = await ctx.as("POST", `/media/${bare.mediaId}/complete`);
    assert.equal(processing.body.data.status, "PROCESSING");
  });

  test("declared metadata is bounded; a stored size that differs from the authorised one is refused", async () => {
    const { mediaId, uploadUrl } = await authorise({ filename: "x.jpg", mimeType: "image/jpeg", fileSizeBytes: 100 });
    put(uploadUrl, 100, "image/jpeg");
    for (const body of [{ width: 0, height: 10 }, { width: 10 }, { checksumSha256: "nothex" }, { width: 10, height: 10, colour: "red" }]) {
      assert.equal((await ctx.as("POST", `/media/${mediaId}/complete`, body)).status, 422, JSON.stringify(body));
    }
    put(uploadUrl, 99, "image/jpeg");
    const mismatch = await ctx.as("POST", `/media/${mediaId}/complete`, { width: 10, height: 10 });
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.body.error.code, "UPLOAD_MISMATCH");
  });

  test("identical bytes are one asset across audiences, at authorisation and at completion", async () => {
    const first = await authorise({ filename: "a.jpg", mimeType: "image/jpeg", fileSizeBytes: 7, audience: "PRIVATE", checksumSha256: sha("b") });
    put(first.uploadUrl, 7, "image/jpeg");
    await ctx.as("POST", `/media/${first.mediaId}/complete`, { checksumSha256: sha("b"), width: 1, height: 1 });
    const early = await ctx.as("POST", "/media/uploads", { filename: "b.jpg", mimeType: "image/jpeg", fileSizeBytes: 7, checksumSha256: sha("b") });
    assert.equal(early.status, 409);
    assert.deepEqual([early.body.error.code, early.body.error.details.mediaId], ["MEDIA_DUPLICATE", first.mediaId]);
    // Undeclared at authorisation, declared at completion: still caught.
    const late = await authorise({ filename: "c.jpg", mimeType: "image/jpeg", fileSizeBytes: 7 });
    put(late.uploadUrl, 7, "image/jpeg");
    const refused = await ctx.as("POST", `/media/${late.mediaId}/complete`, { checksumSha256: sha("b"), width: 1, height: 1 });
    assert.equal(refused.status, 409);
    assert.equal(refused.body.error.details.mediaId, first.mediaId);
    // The discarded upload leaves no orphan row in the library.
    assert.equal((await ctx.as("GET", `/media/${late.mediaId}`)).status, 404);
  });

  test("the library filters by audience", async () => {
    const privateOnly = (await ctx.as("GET", "/media?audience=PRIVATE&pageSize=100")).body.data as { isPrivate: boolean }[];
    const publicOnly = (await ctx.as("GET", "/media?audience=PUBLIC&pageSize=100")).body.data as { isPrivate: boolean }[];
    assert.ok(privateOnly.length >= 2 && privateOnly.every((m) => m.isPrivate));
    assert.ok(publicOnly.length > 0 && publicOnly.every((m) => !m.isPrivate));
    assert.equal((await ctx.as("GET", "/media?audience=SECRET")).status, 422);
  });

  test("a public page cannot publish a private original; a private project can", async () => {
    const { mediaId, uploadUrl } = await authorise({ filename: "frame.jpg", mimeType: "image/jpeg", fileSizeBytes: 64, audience: "PRIVATE" });
    put(uploadUrl, 64, "image/jpeg");
    await ctx.as("POST", `/media/${mediaId}/complete`, { width: 1600, height: 900 });
    const create = async (slug: string, extra: Record<string, unknown>) =>
      (await ctx.as("POST", "/projects", { title: slug, slug, year: 2026, coverMediaId: mediaId, ...extra })).body.data.id as string;
    const open = await create("private-still-public", {});
    const refused = await ctx.as("POST", `/projects/${open}/publish`);
    assert.equal(refused.status, 422);
    assert.match(JSON.stringify(refused.body), /private storage/);
    const gated = await create("private-still-gated", { visibility: "PRIVATE", password: "a long enough password" });
    const published = await ctx.as("POST", `/projects/${gated}/publish`);
    assert.equal(published.status, 200, JSON.stringify(published.body));
    // Visibility is live, so the published private media keep the project
    // from becoming PUBLIC.
    const flip = await ctx.as("PATCH", `/projects/${gated}`, { visibility: "PUBLIC" });
    assert.equal(flip.status, 409);
    assert.equal(flip.body.error.code, "PROJECT_NOT_PUBLIC_READY");
    // In use (cover and live snapshot): it cannot be deleted.
    assert.equal((await ctx.as("DELETE", `/media/${mediaId}`)).status, 409);
  });
});
