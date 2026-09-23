import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Studio and the API are never indexed (CLAUDE.md §16). Public routes
  // get no extra headers.
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/admin", headers: noindex },
      { source: "/admin/:path*", headers: noindex },
      { source: "/api/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
