import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@db/client";
import { ADMIN_SESSION_COOKIE, createAuthService } from "@/features/authentication/auth.service";
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
    // An admin's preview renders the working copy at the page itself.
    if (request.cookies.has(DRAFT_MODE_COOKIE) && (await isAdmin(request))) return NextResponse.next();
    return request.cookies.has(accessCookieName(slug))
      ? NextResponse.rewrite(new URL(`/works/${slug}/live`, request.url))
      : NextResponse.next();
  }
  // An admin previewing a project that has never been published: the page
  // renders its working copy (draft mode is dynamic, so nothing is cached).
  // Both cookies are checked here, the session against the database, so a
  // forged cookie cannot make an arbitrary address render.
  if (request.cookies.has(DRAFT_MODE_COOKIE) && (await isAdmin(request))) return NextResponse.next();
  // No route answers this path, so Next.js serves its 404 page.
  return NextResponse.rewrite(new URL(`/works/${encodeURIComponent(slug || "_")}/not-found`, request.url));
}

// Next.js's draft-mode cookie.
const DRAFT_MODE_COOKIE = "__prerender_bypass";

async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null;
  if (!token) return false;
  try {
    return (await createAuthService(getDatabase()).authenticate(token)) !== null;
  } catch {
    return false;
  }
}

export const config = { matcher: "/works/:slug" };
