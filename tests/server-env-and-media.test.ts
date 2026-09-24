import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseServerEnv } from "@/lib/env/server-env";
import {
  createLocalMediaStorage,
  createS3MediaStorage,
  mediaKeys,
  MediaStorageUnsupportedError,
  setMediaStorageForTesting,
} from "@/lib/storage/media-storage";
import { assertMediaKey, mediaKeyFromUrl, mediaUrl } from "@/lib/storage/media-url";

describe("server environment", () => {
  test("defaults to the static adapter and needs no database", () => {
    const env = parseServerEnv({});
    assert.equal(env.SITE_CONTENT_ADAPTER, "static");
    assert.equal(env.DATABASE_URL, undefined);
    assert.equal(env.MEDIA_PUBLIC_BASE_URL, "/media");
  });
  test("an unknown adapter fails clearly", () => {
    assert.throws(() => parseServerEnv({ SITE_CONTENT_ADAPTER: "sanity" }), /SITE_CONTENT_ADAPTER/);
  });
  test("the database adapter requires DATABASE_URL", () => {
    assert.throws(() => parseServerEnv({ SITE_CONTENT_ADAPTER: "db" }), /DATABASE_URL/);
    const env = parseServerEnv({ SITE_CONTENT_ADAPTER: "db", DATABASE_URL: "postgres://localhost:5432/portfolio" });
    assert.equal(env.SITE_CONTENT_ADAPTER, "db");
  });
  test("malformed values are rejected", () => {
    assert.throws(() => parseServerEnv({ DATABASE_URL: "mysql://localhost/x" }), /DATABASE_URL/);
    assert.throws(() => parseServerEnv({ MEDIA_PUBLIC_BASE_URL: "https://cdn.example.com/media/" }), /slash/);
  });
});

describe("media URL resolution", () => {
  test("default output is unchanged from the locked site", () => {
    assert.equal(mediaUrl("home/n1.mp4"), "/media/home/n1.mp4");
    assert.equal(mediaUrl("projects/made-to-measure/c1.mp4"), "/media/projects/made-to-measure/c1.mp4");
  });
  test("keys are relative paths under the media root", () => {
    assert.throws(() => assertMediaKey("/media/home/n1.mp4"));
    assert.throws(() => assertMediaKey("home/../../etc/passwd"));
    assert.throws(() => assertMediaKey(""));
  });
  test("mediaKeyFromUrl inverts mediaUrl and ignores foreign URLs", () => {
    assert.equal(mediaKeyFromUrl(mediaUrl("works/desk-01.jpg")), "works/desk-01.jpg");
    assert.equal(mediaKeyFromUrl("https://example.com/a.jpg"), null);
  });
  test("mediaKeyFromUrl works with the s3 adapter, which refuses an empty key", () => {
    setMediaStorageForTesting(
      createS3MediaStorage({
        endpoint: "https://acct.r2.cloudflarestorage.com",
        region: "auto",
        publicBucket: "portfolio-public",
        privateBucket: "portfolio-private",
        accessKeyId: "id",
        secretAccessKey: "secret",
        pathStyle: true,
        publicBaseUrl: "https://pub-0123.r2.dev",
        uploadTtlSeconds: 300,
      }),
    );
    try {
      assert.equal(mediaKeyFromUrl("https://pub-0123.r2.dev/home/n1.mp4"), "home/n1.mp4");
      assert.equal(mediaKeyFromUrl(mediaUrl("works/desk-01.jpg")), "works/desk-01.jpg");
      assert.equal(mediaKeyFromUrl("https://pub-0123.r2.dev/"), null);
      assert.equal(mediaKeyFromUrl("/media/home/n1.mp4"), null);
    } finally {
      setMediaStorageForTesting(undefined);
    }
  });
  test("a configured base changes only the root", () => {
    const storage = createLocalMediaStorage("https://cdn.example.com/media");
    assert.equal(storage.publicUrl("home/n1.mp4"), "https://cdn.example.com/media/home/n1.mp4");
  });
  test("the local adapter refuses uploads rather than pretending", async () => {
    await assert.rejects(
      createLocalMediaStorage("/media").createUpload({ key: "k", mimeType: "image/jpeg", byteSize: 1 }),
      MediaStorageUnsupportedError,
    );
  });
  test("upload keys separate originals from variants", () => {
    assert.equal(mediaKeys.original("m1", "My Film.MOV"), "originals/m1/my-film.mov");
    assert.equal(mediaKeys.variant("m1", "w1600", "webp"), "variants/m1/w1600.webp");
  });
});
