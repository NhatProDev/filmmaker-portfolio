import type { ProjectBlock, ProjectDetail, ProjectFacts, WorksCover } from "./site-content.types";

// The committed Project Detail content (src/content/projects.ts) as the block
// renderer's view model: the same blocks, in the same order, that the import
// stores for it (scripts/lib/static-import.ts), so the static and database
// adapters render one page identically. Ids are stable names; only the
// renderer's keys use them.
export function staticProjectContent(
  year: number,
  cover: WorksCover,
  detail: ProjectDetail | null,
): { facts: ProjectFacts; credits: ProjectDetail["credits"]; blocks: ProjectBlock[] } {
  const facts: ProjectFacts = {
    year,
    ...(detail?.runtime !== undefined ? { runtime: detail.runtime } : {}),
    ...(detail?.client !== undefined ? { client: detail.client } : {}),
    ...(detail?.role !== undefined ? { role: detail.role } : {}),
  };
  const coverImage = { ...cover, alt: "" };
  if (!detail) {
    return {
      facts,
      credits: [],
      blocks: [
        { type: "opening", id: "opening", image: coverImage },
        { type: "projectMeta", id: "facts", statement: null },
      ],
    };
  }
  const { film, statement, stills, loop, credits, coda } = detail;
  const blocks: ProjectBlock[] = [
    film
      ? { type: "opening", id: "opening", image: film.poster, film: { src: film.src, width: film.width, height: film.height } }
      : { type: "opening", id: "opening", image: coverImage },
    { type: "projectMeta", id: "meta", statement: statement ? { lead: [statement.lead], body: [statement.body] } : null },
  ];
  if (stills.length) blocks.push({ type: "projectStills", id: "stills", stills });
  if (loop) blocks.push({ type: "projectLoop", id: "loop", src: loop.src, poster: loop.poster, caption: [loop.caption] });
  if (credits.length) blocks.push({ type: "projectCredits", id: "credits" });
  if (coda) blocks.push({ type: "projectCoda", id: "coda", image: coda });
  return { facts, credits, blocks };
}
