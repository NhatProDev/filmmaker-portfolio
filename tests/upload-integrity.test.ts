import "./helpers/access-secret";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { parseServerEnv } from "@/lib/env/server-env";
import { createS3MediaStorage, setMediaStorageForTesting, type S3Config } from "@/lib/storage/media-storage";
import { presignS3 } from "@/lib/storage/s3-presign";
import { createApiTestContext } from "./helpers/api";

// Phase 3D-14: upload integrity. A browser uploads straight to storage, so the
// server never sees the bytes. With S3_UPLOAD_CHECKSUMS the signed PUT binds
// the browser's SHA-256 (x-amz-checksum-sha256) and the provider refuses any
// other body; completion then reads the provider's own checksum back and
// prefers it over anything the browser declares.

const hex = (c: string) => c.repeat(64);
const b64 = (h: string) => Buffer.from(h, "hex").toString("base64");

const config: S3Config = {
  endpoint: "https://acct.r2.cloudflarestorage.com",
  region: "auto",
  publicBucket: "pub",
  privateBucket: "priv",
  accessKeyId: "id",
  secretAccessKey: "secret",
  pathStyle: true,
  publicBaseUrl: "https://media.example.com",
  uploadTtlSeconds: 600,
};

describe("presigned uploads can bind a checksum header", () => {
  const location = { endpoint: config.endpoint, bucket: "pub", key: "originals/a/b.jpg", region: "auto", pathStyle: true };
  const credentials = { accessKeyId: "id", secretAccessKey: "secret" };
  const now = new Date("2026-09-25T00:00:00Z");

  test("an extra header is signed; without one only host is", () => {
    const plain = new URL(presignS3({ method: "PUT", location, credentials, expiresInSeconds: 60, now }));
    assert.equal(plain.searchParams.get("X-Amz-SignedHeaders"), "host");
    const bound = new URL(
      presignS3({ method: "PUT", location, credentials, expiresInSeconds: 60, now, headers: { "x-amz-checksum-sha256": b64(hex("a")) } }),
    );
    assert.equal(bound.searchParams.get("X-Amz-SignedHeaders"), "host;x-amz-checksum-sha256");
    const other = new URL(
      presignS3({ method: "PUT", location, credentials, expiresInSeconds: 60, now, headers: { "x-amz-checksum-sha256": b64(hex("b")) } }),
    );
    assert.notEqual(bound.searchParams.get("X-Amz-Signature"), other.searchParams.get("X-Amz-Signature"));
    // The checksum is a header, never hoisted into the query: R2 ignores it there.
    assert.equal(bound.searchParams.get("x-amz-checksum-sha256"), null);
  });

  test("header names must be lower case and never host", () => {
    for (const headers of [{ "X-Amz-Checksum-Sha256": "x" }, { host: "evil.example" }]) {
      assert.throws(() => presignS3({ method: "PUT", location, credentials, expiresInSeconds: 60, now, headers }));
    }
  });

  test("the adapter binds the checksum only when switched on and declared", async () => {
    const off = await createS3MediaStorage(config).createUpload({ key: "originals/x/a.jpg", mimeType: "image/jpeg", byteSize: 1, checksumSha256: hex("c") });
    assert.deepEqual(off.headers, { "content-type": "image/jpeg" });
    assert.equal(new URL(off.url).searchParams.get("X-Amz-SignedHeaders"), "host");

    const on = createS3MediaStorage({ ...config, uploadChecksums: true });
    const bound = await on.createUpload({ key: "originals/x/a.jpg", mimeType: "image/jpeg", byteSize: 1, checksumSha256: hex("c") });
    assert.deepEqual(bound.headers, { "content-type": "image/jpeg", "x-amz-checksum-sha256": b64(hex("c")) });
    assert.equal(new URL(bound.url).searchParams.get("X-Amz-SignedHeaders"), "host;x-amz-checksum-sha256");

    const undeclared = await on.createUpload({ key: "originals/x/a.jpg", mimeType: "image/jpeg", byteSize: 1 });
    assert.deepEqual(undeclared.headers, { "content-type": "image/jpeg" });
  });

  test("verification asks for the provider's checksum and reads it as hex; an ETag is never used", async () => {
    let sent: Headers | undefined;
    const storage = createS3MediaStorage(config, (async (_url: string, init?: RequestInit) => {
      sent = new Headers(init?.headers);
      return new Response(null, {
        status: 200,
        headers: { "content-length": "5", "content-type": "image/jpeg", "x-amz-checksum-sha256": b64(hex("d")), etag: `"${"e".repeat(32)}"` },
      });
    }) as typeof fetch);
    const stored = await storage.verifyUpload("originals/x/a.jpg");
    assert.equal(sent?.get("x-amz-checksum-mode"), "ENABLED");
    assert.deepEqual(stored, { key: "originals/x/a.jpg", byteSize: 5, mimeType: "image/jpeg", checksumSha256: hex("d") });

    const bare = createS3MediaStorage(config, (async () =>
      new Response(null, { status: 200, headers: { "content-length": "5", etag: `"${"e".repeat(32)}-3"` } })) as typeof fetch);
    assert.equal((await bare.verifyUpload("originals/x/a.jpg"))?.checksumSha256, undefined);
  });

  test("the switch is off unless set to true", () => {
    assert.equal(parseServerEnv({}).S3_UPLOAD_CHECKSUMS, "false");
    assert.equal(parseServerEnv({ S3_UPLOAD_CHECKSUMS: "true" }).S3_UPLOAD_CHECKSUMS, "true");
    assert.throws(() => parseServerEnv({ S3_UPLOAD_CHECKSUMS: "yes" }));
  });
});

describe("completion trusts the provider's checksum over the browser's", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  const stored = new Map<string, { size: number; checksum?: string }>();

  before(async () => {
    ctx = await createApiTestContext();
    setMediaStorageForTesting(
      createS3MediaStorage({ ...config, uploadChecksums: true }, (async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        const object = stored.get(decodeURIComponent(url.pathname.slice(1)));
        if ((init?.method ?? "GET") !== "HEAD") return new Response(null, { status: 204 });
        if (!object) return new Response(null, { status: 404 });
        const headers: Record<string, string> = { "content-length": String(object.size), "content-type": "image/jpeg" };
        if (object.checksum) headers["x-amz-checksum-sha256"] = b64(object.checksum);
        return new Response(null, { status: 200, headers });
      }) as typeof fetch),
    );
  });
  after(async () => {
    setMediaStorageForTesting(undefined);
    await ctx.close();
  });

  const authorise = async (body: Record<string, unknown>) => {
    const response = await ctx.as("POST", "/media/uploads", body);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.data as { mediaId: string; uploadUrl: string; headers: Record<string, string> };
  };
  const put = (uploadUrl: string, size: number, checksum?: string) =>
    stored.set(decodeURIComponent(new URL(uploadUrl).pathname.slice(1)), { size, checksum });

  test("the authorisation tells the browser to send the bound checksum", async () => {
    const auth = await authorise({ filename: "a.jpg", mimeType: "image/jpeg", fileSizeBytes: 3, checksumSha256: hex("1") });
    assert.equal(auth.headers["x-amz-checksum-sha256"], b64(hex("1")));
  });

  test("a provider checksum is recorded even when the browser declares none", async () => {
    const auth = await authorise({ filename: "b.jpg", mimeType: "image/jpeg", fileSizeBytes: 3 });
    put(auth.uploadUrl, 3, hex("2"));
    const done = await ctx.as("POST", `/media/${auth.mediaId}/complete`, { width: 3, height: 2 });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.equal(done.body.data.checksumSha256, hex("2"));
  });

  test("a declared checksum that disagrees with the provider's is refused and nothing becomes READY", async () => {
    const auth = await authorise({ filename: "c.jpg", mimeType: "image/jpeg", fileSizeBytes: 3, checksumSha256: hex("3") });
    put(auth.uploadUrl, 3, hex("4"));
    const refused = await ctx.as("POST", `/media/${auth.mediaId}/complete`, { checksumSha256: hex("3"), width: 3, height: 2 });
    assert.equal(refused.status, 409);
    assert.equal(refused.body.error.code, "UPLOAD_MISMATCH");
    assert.equal((await ctx.as("GET", `/media/${auth.mediaId}`)).body.data.status, "UPLOADING");
  });

  test("duplicates are found by the provider's checksum", async () => {
    const auth = await authorise({ filename: "d.jpg", mimeType: "image/jpeg", fileSizeBytes: 3 });
    put(auth.uploadUrl, 3, hex("2"));
    const refused = await ctx.as("POST", `/media/${auth.mediaId}/complete`, { width: 3, height: 2 });
    assert.equal(refused.status, 409);
    assert.equal(refused.body.error.code, "MEDIA_DUPLICATE");
  });
});
