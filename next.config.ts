import type { NextConfig } from "next";
import { securityHeadersFromEnv } from "./src/lib/http/security-headers";

const nextConfig: NextConfig = {
  // Every response carries the security headers (CLAUDE.md §16,
  // src/lib/http/security-headers.ts). The Studio and the API are never
  // indexed.
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: securityHeadersFromEnv(process.env) },
      { source: "/admin", headers: noindex },
      { source: "/admin/:path*", headers: noindex },
      { source: "/api/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
