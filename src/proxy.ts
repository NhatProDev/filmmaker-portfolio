import { NextResponse, type NextRequest } from "next/server";
import { accessCookieName } from "@/features/project-access/access-cookie";
import { createProjectRouter } from "@/features/site-content/project-router";
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
// binding are verified by ./live itself. A project published a moment ago is
// routed at once (project-router.ts).

let router: ReturnType<typeof createProjectRouter> | undefined;

export async function proxy(request: NextRequest) {
  let slug: string;
  try {
    slug = decodeURIComponent(request.nextUrl.pathname.split("/")[2] ?? "");
  } catch {
    slug = "";
  }
  router ??= createProjectRouter(getContentGateway());
  let route: Awaited<ReturnType<typeof router.route>>;
  try {
    route = await router.route(slug);
  } catch (error) {
    // Without the index, the pages decide as they would without a proxy.
    console.error("[proxy] project routes unavailable", error);
    return NextResponse.next();
  }
  if (route === "public") return NextResponse.next();
  if (route === "private") {
    return request.cookies.has(accessCookieName(slug))
      ? NextResponse.rewrite(new URL(`/works/${slug}/live`, request.url))
      : NextResponse.next();
  }
  // No route answers this path, so Next.js serves its 404 page.
  return NextResponse.rewrite(new URL(`/works/${encodeURIComponent(slug || "_")}/not-found`, request.url));
}

export const config = { matcher: "/works/:slug" };
