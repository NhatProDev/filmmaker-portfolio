import type { MetadataRoute } from "next";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import { siteUrl } from "@/lib/site-url";

// The public pages, every PUBLIC published project (ADR-0003: a private
// project is never listed anywhere) and every published album (ADR-0019). Regenerated at most hourly; a sitemap may
// lag a publish without harm.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const gateway = getContentGateway();
  const [slugs, albums] = await Promise.all([gateway.listPublicProjectSlugs(), gateway.listPublicAlbumSlugs()]);
  return [
    { url: `${origin}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/works`, changeFrequency: "monthly", priority: 0.9 },
    ...slugs.map((slug) => ({ url: `${origin}/works/${slug}`, changeFrequency: "yearly" as const, priority: 0.8 })),
    { url: `${origin}/about`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${origin}/contact`, changeFrequency: "yearly", priority: 0.5 },
    ...(albums.length
      ? [
          { url: `${origin}/albums`, changeFrequency: "monthly" as const, priority: 0.7 },
          ...albums.map((slug) => ({ url: `${origin}/albums/${slug}`, changeFrequency: "yearly" as const, priority: 0.6 })),
        ]
      : []),
  ];
}
