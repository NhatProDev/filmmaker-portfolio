import type { ContentGateway } from "./site-content.types";

// How src/proxy.ts decides where /works/<slug> goes, without rendering
// (ADR-0003, ADR-0012; docs/architecture/publishing-and-private-access.md §3).
//
// Published slugs are held in a short-lived index so that a page view costs no
// query. An address the index does not know is looked up fresh, one slug, so a
// project is routable the moment Publish returns — on every server instance,
// whatever its index holds. Only the reverse can lag: for at most the index
// lifetime an instance may still route a withdrawn slug to its page, which by
// then has been revalidated and renders no project content.

export type ProjectRoute = "public" | "private" | "unknown";

type RouteSource = Pick<ContentGateway, "listProjectRoutes" | "findProjectRoute">;

// Only a well-formed slug can name a project; anything else never reaches the
// database.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createProjectRouter(source: RouteSource, options: { ttlMs?: number; now?: () => number } = {}) {
  const ttlMs = options.ttlMs ?? 10_000;
  const now = options.now ?? Date.now;
  let index: { at: number; public: Set<string>; private: Set<string> } | null = null;

  async function current() {
    if (!index || now() - index.at > ttlMs) {
      const routes = await source.listProjectRoutes();
      index = { at: now(), public: new Set(routes.public), private: new Set(routes.private) };
    }
    return index;
  }

  return {
    async route(slug: string): Promise<ProjectRoute> {
      if (slug.length > 200 || !SLUG.test(slug)) return "unknown";
      const known = await current();
      if (known.public.has(slug)) return "public";
      if (known.private.has(slug)) return "private";
      const fresh = await source.findProjectRoute(slug);
      if (!fresh) return "unknown";
      known[fresh].add(slug);
      return fresh;
    },
  };
}
