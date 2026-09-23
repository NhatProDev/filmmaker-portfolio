import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { load } from "js-yaml";
import {
  BLOCK_TYPES,
  GALLERY_PRESETS,
  GRID_PRESETS,
  IMAGE_PRESETS,
  TEXT_ROLES,
} from "@/features/project-builder/block.schema";

type Node = Record<string, unknown>;

const contract = load(readFileSync("openapi.yaml", "utf8")) as Node;
const schemas = (contract.components as Node).schemas as Record<string, Node>;

function walk(value: unknown, visit: (node: Node) => void) {
  if (Array.isArray(value)) value.forEach((v) => walk(v, visit));
  else if (value && typeof value === "object") {
    visit(value as Node);
    Object.values(value).forEach((v) => walk(v, visit));
  }
}

function resolve(ref: string): unknown {
  assert.ok(ref.startsWith("#/"), `external ref ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce<unknown>((node, key) => (node as Node | undefined)?.[key], contract);
}

const enumAt = (path: string[]) => path.reduce<unknown>((node, key) => (node as Node)[key], schemas) as string[];

describe("openapi.yaml, the HTTP contract (CLAUDE.md §8, §22)", () => {
  test("is OpenAPI 3.1 and every $ref resolves", () => {
    assert.equal(contract.openapi, "3.1.0");
    const refs: string[] = [];
    walk(contract, (node) => {
      if (typeof node.$ref === "string") refs.push(node.$ref);
      const mapping = (node.discriminator as Node | undefined)?.mapping as Record<string, string> | undefined;
      if (mapping) refs.push(...Object.values(mapping));
    });
    assert.ok(refs.length > 100);
    for (const ref of refs) assert.ok(resolve(ref) !== undefined, `unresolved ${ref}`);
  });

  test("operation ids are unique and every path is versioned under the server /api/v1", () => {
    assert.deepEqual(contract.servers, [{ url: "/api/v1", description: "Same-origin application API" }]);
    const ids: string[] = [];
    for (const item of Object.values(contract.paths as Record<string, Node>)) {
      for (const [method, operation] of Object.entries(item)) {
        if (method === "parameters") continue;
        ids.push((operation as Node).operationId as string);
      }
    }
    assert.equal(new Set(ids).size, ids.length);
  });

  test("mirrors the executable block contract", () => {
    assert.deepEqual(enumAt(["BlockType", "enum"]), [...BLOCK_TYPES]);
    assert.deepEqual(enumAt(["GridConfig", "properties", "preset", "enum"]), [...GRID_PRESETS]);
    assert.deepEqual(enumAt(["ImageConfig", "properties", "preset", "enum"]), [...IMAGE_PRESETS]);
    assert.deepEqual(enumAt(["TextConfig", "properties", "role", "enum"]), [...TEXT_ROLES]);
    const videoGrid = (schemas.GalleryConfig.oneOf as Node[]).find(
      (variant) => ((variant.properties as Node).mode as Node).const === "VIDEO_GRID",
    )!;
    assert.deepEqual(((videoGrid.properties as Node).preset as Node).enum, [...GALLERY_PRESETS]);
    const mapping = (schemas.Block.discriminator as Node).mapping as Record<string, string>;
    assert.deepEqual(Object.keys(mapping), [...BLOCK_TYPES]);
  });

  test("never exposes or accepts what the architecture forbids", () => {
    const text = JSON.stringify(contract);
    assert.ok(!/"passwordHash"/.test(text), "password hashes are never serialised");
    // Derived playback flags are not inputs (ADR-0008).
    walk(schemas.Playback, (node) => {
      const properties = node.properties as Node | undefined;
      for (const flag of ["autoplay", "muted", "playsInline", "preload", "pauseWhenOffscreen"]) {
        assert.ok(!properties || !(flag in properties), flag);
      }
    });
    // Ordering is written only by the ordering endpoints (ADR-0002).
    const update = schemas.UpdateProjectRequest.properties as Node;
    assert.ok(!("displayPosition" in update) && !("featuredPosition" in update));
    // The HERO overlay carries no authored text (ADR-0010).
    const overlay = ((schemas.HeroConfig.properties as Node).overlay as Node).properties as Node;
    assert.ok(!("title" in overlay) && !("text" in overlay));
    assert.equal(((schemas.HeroConfig.properties as Node).overlay as Node).additionalProperties, false);
  });
});
