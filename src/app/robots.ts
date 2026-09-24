import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// The Studio and the API are never crawled (they also answer
// X-Robots-Tag: noindex). Private projects and previews carry their own
// noindex and are never listed in the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
