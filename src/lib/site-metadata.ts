import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";

// Shared public metadata (3D-10). A page's openGraph object replaces the root
// layout's whole, so every page builds it here and none loses the site name,
// type or locale. og:title falls back to the page's resolved <title>.

export const SITE_NAME = "Nguyen Khanh Nhat";

type OgImage = { src: string; width: number; height: number };

export function openGraph(url: string, extra: { title?: string; image?: OgImage | null } = {}): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url,
    ...(extra.title ? { title: extra.title } : {}),
    ...(extra.image ? { images: [{ url: extra.image.src, width: extra.image.width, height: extra.image.height }] } : {}),
  };
}

// Structured data for Home: the site and the person it belongs to. Only facts
// the site already states — the name and the address — and nothing inferred.
export function homeStructuredData(): string {
  const url = `${siteUrl()}/`;
  const graph = [
    { "@type": "WebSite", "@id": `${url}#website`, name: SITE_NAME, url, publisher: { "@id": `${url}#person` } },
    { "@type": "Person", "@id": `${url}#person`, name: SITE_NAME, url },
  ];
  // Escaped so the JSON can never close its <script> element.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\u003c");
}
