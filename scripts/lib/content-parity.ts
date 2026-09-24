import type { ContentGateway } from "@/features/site-content/site-content.types";
import { mediaKeyFromUrl } from "@/lib/storage/media-url";
import type { ProbedMedia } from "./media-probe";

// Compares what two content gateways serve, route by route, by content: every
// media URL is replaced by the SHA-256 of the file it serves, because
// de-duplication legitimately serves a shared asset from one copy's URL. Block
// ids are dropped: they are the renderer's keys (a database id or a static
// name), not content.

export function byContent(value: unknown, files: ReadonlyMap<string, ProbedMedia>): unknown {
  if (typeof value === "string") {
    const key = mediaKeyFromUrl(value);
    const file = key ? files.get(key) : undefined;
    return file?.exists ? `sha256:${file.sha256}` : value;
  }
  if (Array.isArray(value)) return value.map((v) => byContent(v, files));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== "id")
        .map(([k, v]) => [k, byContent(v, files)]),
    );
  }
  return value;
}

// The paths at which two values differ.
export function diffs(a: unknown, b: unknown, path = ""): string[] {
  if (Object.is(a, b)) return [];
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) {
    return [path || "(root)"];
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].flatMap((k) =>
    diffs((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k),
  );
}

export type RouteComparison = { route: string; diffs: string[] };

// Every public route the site serves, compared.
export async function compareGateways(
  candidate: ContentGateway,
  reference: ContentGateway,
  files: ReadonlyMap<string, ProbedMedia>,
): Promise<RouteComparison[]> {
  const compare = (route: string, a: unknown, b: unknown): RouteComparison => ({
    route,
    diffs: diffs(byContent(a, files), byContent(b, files)),
  });
  const [candidateSlugs, referenceSlugs] = await Promise.all([
    candidate.listPublicProjectSlugs(),
    reference.listPublicProjectSlugs(),
  ]);
  const results: RouteComparison[] = [
    compare("/", await candidate.getHome(), await reference.getHome()),
    compare("/works", await candidate.getWorksIndex(), await reference.getWorksIndex()),
    compare("(project slugs)", candidateSlugs, referenceSlugs),
    compare("/about", await candidate.getAbout(), await reference.getAbout()),
    compare("/contact", await candidate.getContact(), await reference.getContact()),
  ];
  for (const slug of new Set([...candidateSlugs, ...referenceSlugs])) {
    results.push(
      compare(`/works/${slug}`, await candidate.getProjectPage(slug), await reference.getProjectPage(slug)),
    );
  }
  return results;
}
