import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseBlock } from "@/features/project-builder/block.schema";
import { markupToParagraphs, paragraphsToMarkup } from "@/features/project-builder/inline-markup";

// Phase 3B rich text: the Studio's editing notation converts to the block
// contract's inline runs and back, and refuses anything outside them.

const parse = (markup: string) => {
  const result = markupToParagraphs(markup);
  if (!result.ok) assert.fail(result.error);
  return result.paragraphs;
};
const refuse = (markup: string, pattern: RegExp) => {
  const result = markupToParagraphs(markup);
  assert.equal(result.ok, false, `accepted: ${markup}`);
  if (!result.ok) assert.match(result.error, pattern);
};

describe("rich text authoring (Phase 3B)", () => {
  test("emphasis and links become inline runs; plain text stays plain", () => {
    assert.deepEqual(parse("Shot on *16mm* for [Kodak](https://kodak.com), see [the works](/works)."), [
      ["Shot on ", { em: "16mm" }, " for ", { link: { href: "https://kodak.com", text: "Kodak" } }, ", see ", { link: { href: "/works", text: "the works" } }, "."],
    ]);
    assert.deepEqual(parse("One.\n\nTwo\nlines."), [["One."], ["Two\nlines."]]);
    assert.deepEqual(parse("[Write](mailto:hello@example.com)"), [[{ link: { href: "mailto:hello@example.com", text: "Write" } }]]);
  });

  test("every stored paragraph survives a round trip, escapes included", () => {
    const stored = [
      ["A ", { em: "star*" }, " and [brackets] \\ backslash"],
      [{ link: { href: "https://example.com/a_(b)", text: "x" } }],
      ["plain"],
    ];
    assert.deepEqual(parse(paragraphsToMarkup(stored as never)), stored);
  });

  test("links go only to a site path, https or mailto", () => {
    refuse("[x](javascript:alert(1))", /site path|https|mailto/);
    refuse("[x](http://insecure.example)", /site path|https|mailto/);
    refuse("[x](//evil.example)", /site path|https|mailto/);
    refuse("[x](data:text/html,hi)", /site path|https|mailto/);
    refuse("[x](https://a b)", /site path|https|mailto/);
  });

  test("no nesting, no unbalanced marks, no empty marks", () => {
    refuse("*open", /closing \*/);
    refuse("*a [b](/c) d*", /inside emphasis/);
    refuse("[a *b*](/c)", /inside a link/);
    refuse("[words] alone", /destination/);
    refuse("stray ] here", /without its \[/);
    refuse("**", /empty/);
    refuse("   \n\n  ", /empty/);
  });

  test("HTML is only ever text: nothing becomes markup", () => {
    const [paragraph] = parse("<b>bold</b> <script>x</script>");
    assert.deepEqual(paragraph, ["<b>bold</b> <script>x</script>"]);
  });

  test("the block contract still refuses what the notation cannot produce", () => {
    const text = (runs: unknown[]) => ({ type: "TEXT", content: { kind: "richText", paragraphs: [runs] }, config: {} });
    const context = { owner: "project" as const, parentType: null };
    assert.throws(() => parseBlock(text([{ strong: "bold" }]), context));
    assert.throws(() => parseBlock(text([{ html: "<b>x</b>" }]), context));
    assert.throws(() => parseBlock(text([{ link: { href: "javascript:alert(1)", text: "x" } }]), context));
    assert.doesNotThrow(() => parseBlock(text(parse("*a* [b](/works)")[0]), context));
  });
});
