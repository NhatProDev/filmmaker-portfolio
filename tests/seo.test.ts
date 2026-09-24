import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { homeStructuredData, openGraph, SITE_NAME } from "@/lib/site-metadata";

// Phase 3D-10: every public page's Open Graph keeps the site name, type and
// locale, and Home's structured data states only what the site states.

describe("public metadata", () => {
  test("Open Graph restates the site-wide fields on every page", () => {
    assert.deepEqual(openGraph("/about"), { type: "website", siteName: SITE_NAME, locale: "en_US", url: "/about" });
    assert.deepEqual(openGraph("/works/court", { title: "Court", image: { src: "https://cdn/x.jpg", width: 10, height: 5 } }), {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: "/works/court",
      title: "Court",
      images: [{ url: "https://cdn/x.jpg", width: 10, height: 5 }],
    });
    assert.ok(!("images" in openGraph("/", { image: null })));
  });

  test("Home's structured data names the site and its person, and nothing else", () => {
    const data = JSON.parse(homeStructuredData());
    assert.equal(data["@context"], "https://schema.org");
    assert.deepEqual(
      data["@graph"].map((node: Record<string, unknown>) => Object.keys(node).sort()),
      [
        ["@id", "@type", "name", "publisher", "url"],
        ["@id", "@type", "name", "url"],
      ],
    );
    assert.ok(!homeStructuredData().includes("<"), "cannot close its script element");
  });
});
