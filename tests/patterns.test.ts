import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { PATTERNS } from "@/features/project-builder/patterns";
import { createApiTestContext } from "./helpers/api";

// Phase 3C-9: patterns insert ordinary blocks in one request and are never
// linked afterwards (ADR-0013 §1's rule for templates).

describe("reusable patterns", () => {
  let ctx: Awaited<ReturnType<typeof createApiTestContext>>;
  let projectId: string;
  before(async () => {
    ctx = await createApiTestContext();
    projectId = (await ctx.as("POST", "/projects", { title: "Patterns", slug: "patterns-project", year: 2026 })).body.data.id;
  });
  after(() => ctx.close());

  for (const pattern of PATTERNS) {
    test(`${pattern.label} creates valid ordinary blocks in one request`, async () => {
      const values = pattern.fields.map((field) => `${field.label} words *with* emphasis`);
      const response = await ctx.as("POST", `/projects/${projectId}/blocks`, pattern.build(values));
      assert.equal(response.status, 201, JSON.stringify(response.body));
      const block = response.body.data;
      // Nothing records which pattern made it: it is a copy, not a link.
      assert.ok(!JSON.stringify(block.config).includes(pattern.key));
      assert.equal(JSON.stringify(block).includes("pattern"), false);
      const expected = pattern.build(values) as { children?: unknown[] };
      assert.equal(block.children.length, expected.children?.length ?? 0);
    });
  }

  test("patterns carry no media and no placeholder copy", () => {
    for (const pattern of PATTERNS) {
      const body = JSON.stringify(pattern.build(pattern.fields.map(() => "x")));
      assert.ok(!/mediaId|lorem|placeholder/i.test(body), pattern.key);
    }
  });
});
