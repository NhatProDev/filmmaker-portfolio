import { NextResponse, type NextRequest } from "next/server";
import { accessCookieName } from "@/features/project-access/access-cookie";
import { getContentGateway } from "@/features/site-content/site-content.gateway";

// Routes /works/<slug> before anything renders (ADR-0003, ADR-0012):
//
// - a published PUBLIC project goes to its static page;
// - a published PRIVATE project goes to its static password gate, or, for a
//   visitor holding that project's access cookie, to the dynamic,
//   access-checked render (./live), at the same address;
// - any other slug gets the site's prerendered 404, without rendering the
//   project route, so an unknown address never creates a cache entry.
//
// The static pages therefore never read cookies, and private content is never
// rendered into a cacheable page. The cookie's signature, expiry and password
// binding are verified by ./live itself.

const TTL_MS = 10_000;
let routes: { at: number; public: Set<string>; private: Set<string> } | null = null;

async function projectRoutes() {
  if (!routes || Date.now() - routes.at > TTL_MS) {
    const index = await getContentGateway().listProjectRoutes();
    routes = { at: Date.now(), public: new Set(index.public), private: new Set(index.private) };
  }
  return routes;
}

export async function proxy(request: NextRequest) {
  const slug = decodeURIComponent(request.nextUrl.pathname.split("/")[2] ?? "");
  let known: Awaited<ReturnType<typeof projectRoutes>>;
  try {
    known = await projectRoutes();
  } catch (error) {
    // Without the index, the pages decide as they would without a proxy.
    console.error("[proxy] project routes unavailable", error);
    return NextResponse.next();
  }
  if (known.public.has(slug)) return NextResponse.next();
  if (known.private.has(slug)) {
    return request.cookies.has(accessCookieName(slug))
      ? NextResponse.rewrite(new URL(`/works/${slug}/live`, request.url))
      : NextResponse.next();
  }
  // No route answers this path, so Next.js serves its 404 page.
  return NextResponse.rewrite(new URL(`/works/${encodeURIComponent(slug)}/not-found`, request.url));
}

export const config = { matcher: "/works/:slug" };
