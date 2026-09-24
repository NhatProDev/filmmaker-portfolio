import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { api, createApiTestContext } from "./helpers/api";

// Phase 3D: health names the deployed commit where the platform provides it,
// so production can be tied to a release tag; elsewhere it says null.

describe("health release", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  before(async () => {
    ctx = await createApiTestContext({ importContent: false });
  });
  after(async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    await ctx.close();
  });

  test("null without a commit, the short commit with one, never anything else", async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    assert.equal((await api("GET", "/health")).body.data.release, null);
    process.env.VERCEL_GIT_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567";
    assert.equal((await api("GET", "/health")).body.data.release, "0123456789ab");
    process.env.VERCEL_GIT_COMMIT_SHA = "not-a-sha";
    assert.equal((await api("GET", "/health")).body.data.release, null);
  });
});
