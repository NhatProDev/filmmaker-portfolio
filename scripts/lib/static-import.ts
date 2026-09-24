import { basename, join } from "node:path";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "@db/client";
import { blockMedia, media, pages, projectBlocks, projects } from "@db/schema";
import { parseBlock, type BlockType } from "@/features/project-builder/block.schema";
import { createPagePublicationService } from "@/features/project-builder/page-publication.service";
import { createPublicationRepository } from "@/features/project-builder/publication.repository";
import { createProjectPublicationService } from "@/features/projects/publication.service";
import type { ContentGateway, HomeTemplate, ProjectDetail, WorksProject } from "@/features/site-content/site-content.types";
import { staticHomeTemplate, staticProjectDetail } from "@/features/site-content/static-gateway";
import { mediaKeyFromUrl } from "@/lib/storage/media-url";
import { probeMediaFile, type ProbedMedia } from "./media-probe";

// Translates the committed static content into the database model. The static
// content gateway is the only source: nothing here restates the content.
//
// Safety: the import only ever creates what is missing. An existing media
// asset, project or block composition that differs from the static content is
// reported as drift and left untouched, so running it again is a no-op and it
// can never overwrite later edits. It deletes nothing.

export type MediaKind = "IMAGE" | "VIDEO";

export type Placement = {
  key: string;
  kind: MediaKind;
  source: string;
  declared: { width: number; height: number } | null;
  // About and Contact stay static (CLAUDE.md §19): audited, never imported.
  imported: boolean;
};

// posterChecksum: a placement-specific poster, only where it differs from the
// video asset's default (ADR-0015); null inherits the default.
export type DesiredBlockMedia = { checksum: string; altText: string | null; posterChecksum: string | null };

export type DesiredBlock = {
  type: BlockType;
  content: unknown;
  config: unknown;
  media: DesiredBlockMedia[];
  children: DesiredBlock[];
};

export type DesiredAsset = {
  checksum: string;
  key: string;
  type: MediaKind;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  byteSize: number;
  placements: string[];
  posterChecksum: string | null;
};

export type DesiredProject = {
  slug: string;
  title: string;
  year: number;
  displayPosition: number;
  coverChecksum: string;
  previewChecksum: string | null;
  client: string | null;
  role: string | null;
  runtime: string | null;
  credits: { role: string; name: string }[];
  blocks: DesiredBlock[];
};

export type Inventory = {
  placements: Placement[];
  files: Map<string, ProbedMedia>;
  missing: string[];
  dimensionMismatches: string[];
  duplicateGroups: { checksum: string; keys: string[] }[];
  placementPosterOverrides: string[];
};

export type ImportPlan = {
  inventory: Inventory;
  assets: DesiredAsset[];
  projects: DesiredProject[];
  home: DesiredBlock[];
  // Anything here blocks writing.
  issues: string[];
};

// ---- Collecting placements from the gateway ----

async function collectPlacements(gateway: ContentGateway, issues: string[]) {
  const placements: Placement[] = [];
  const add = (
    url: string,
    kind: MediaKind,
    source: string,
    declared: { width: number; height: number } | null,
    imported = true,
  ) => {
    const key = mediaKeyFromUrl(url);
    if (!key) {
      issues.push(`${source}: ${url} is not a media URL under the media root`);
      return;
    }
    placements.push({ key, kind, source, declared, imported });
  };
  const size = (value: { width: number; height: number }) => ({ width: value.width, height: value.height });

  const works = await gateway.getWorksIndex();
  for (const project of works.projects) {
    add(project.cover.src, "IMAGE", `works/${project.slug}: cover`, size(project.cover));
    if (project.preview) add(project.preview, "VIDEO", `works/${project.slug}: preview`, null);
  }

  const details = new Map<string, ProjectDetail>();
  for (const slug of await gateway.listPublicProjectSlugs()) {
    const detail = staticProjectDetail(slug);
    if (!detail) continue;
    details.set(slug, detail);
    const at = `projects/${slug}`;
    if (detail.film) {
      add(detail.film.src, "VIDEO", `${at}: film`, size(detail.film));
      add(detail.film.poster.src, "IMAGE", `${at}: film poster`, size(detail.film.poster));
    }
    detail.stills.forEach((still, i) => add(still.src, "IMAGE", `${at}: still ${i + 1}`, size(still)));
    if (detail.loop) {
      add(detail.loop.src, "VIDEO", `${at}: loop`, null);
      add(detail.loop.poster.src, "IMAGE", `${at}: loop poster`, size(detail.loop.poster));
    }
    if (detail.coda) add(detail.coda.src, "IMAGE", `${at}: coda`, size(detail.coda));
  }

  // Home in its authored shape: its five sections by name (ADR-0018).
  const home = staticHomeTemplate();
  add(home.hero.poster.src, "IMAGE", "home: hero poster", size(home.hero.poster));
  add(home.hero.video, "VIDEO", "home: hero video", null);
  home.wall.items.forEach((item, i) => {
    add(item.poster.src, "IMAGE", `home: wall ${i + 1} poster`, size(item.poster));
    if (item.video) add(item.video, "VIDEO", `home: wall ${i + 1} video`, null);
  });
  add(home.about.portrait.src, "IMAGE", "home: portrait", size(home.about.portrait));
  home.coda.items.forEach((item, i) => add(item.src, "IMAGE", `home: coda ${i + 1}`, size(item)));

  const about = await gateway.getAbout();
  for (const [name, image] of [
    ["portrait", about.portrait.image],
    ["evidence", about.evidence.image],
    ["process", about.process.image],
  ] as const) {
    add(image.src, "IMAGE", `about: ${name}`, size(image), false);
  }
  const contact = await gateway.getContact();
  if (contact.identity) add(contact.identity.image.src, "IMAGE", "contact: identity", size(contact.identity.image), false);

  return { placements, works: works.projects, details, home };
}

// ---- Building the plan ----

const TEXT = (role: string, paragraphs: unknown[][], placement?: { colStart: number; colSpan: number }) => ({
  type: "TEXT" as const,
  content: { kind: "richText", paragraphs },
  config: { role, ...(placement ? { placement: { desktop: placement } } : {}) },
  media: [],
  children: [],
});

export async function buildImportPlan(gateway: ContentGateway, mediaRoot: string): Promise<ImportPlan> {
  const issues: string[] = [];
  const { placements, works, details, home } = await collectPlacements(gateway, issues);

  // Probe every distinct file once.
  const files = new Map<string, ProbedMedia>();
  for (const key of new Set(placements.map((p) => p.key))) files.set(key, await probeMediaFile(join(mediaRoot, key)));

  const missing = [...files.values()].filter((file) => !file.exists).map((file) => file.path);
  missing.forEach((path) => issues.push(`missing file: ${path}`));

  const dimensionMismatches: string[] = [];
  for (const placement of placements) {
    const file = files.get(placement.key)!;
    if (!file.exists) continue;
    const expected = placement.kind === "IMAGE" ? "image/" : "video/";
    if (!file.mimeType.startsWith(expected)) issues.push(`${placement.source}: ${placement.key} is ${file.mimeType}`);
    if (placement.declared && (placement.declared.width !== file.width || placement.declared.height !== file.height)) {
      dimensionMismatches.push(
        `${placement.source}: declared ${placement.declared.width}×${placement.declared.height}, file ${file.width}×${file.height}`,
      );
    }
  }
  dimensionMismatches.forEach((m) => issues.push(`dimension mismatch — ${m}`));

  // Content identity: identical bytes are one asset.
  const keysByChecksum = new Map<string, string[]>();
  for (const [key, file] of files) {
    if (!file.exists) continue;
    keysByChecksum.set(file.sha256, [...(keysByChecksum.get(file.sha256) ?? []), key]);
  }
  const duplicateGroups = [...keysByChecksum]
    .filter(([, keys]) => keys.length > 1)
    .map(([checksum, keys]) => ({ checksum, keys: keys.sort() }));

  const checksumOf = (key: string) => {
    const file = files.get(key);
    return file?.exists ? file.sha256 : null;
  };

  // One asset per checksum among the imported placements; its key is the
  // lexicographically first of the copies, so the choice is deterministic.
  const assets = new Map<string, DesiredAsset>();
  for (const placement of placements.filter((p) => p.imported)) {
    const file = files.get(placement.key)!;
    if (!file.exists) continue;
    const existing = assets.get(file.sha256);
    if (existing) {
      if (existing.type !== placement.kind) issues.push(`${placement.key} is used both as IMAGE and VIDEO`);
      if (!existing.placements.includes(placement.key)) existing.placements.push(placement.key);
      if (placement.key < existing.key) existing.key = placement.key;
      continue;
    }
    assets.set(file.sha256, {
      checksum: file.sha256,
      key: placement.key,
      type: placement.kind,
      mimeType: file.mimeType,
      width: file.width,
      height: file.height,
      durationMs: file.durationMs,
      byteSize: file.byteSize,
      placements: [placement.key],
      posterChecksum: null,
    });
  }

  // A video's first pairing becomes the asset's default poster (ADR-0009).
  // Project compositions are read first. Where the static content pairs the
  // same clip with a different poster elsewhere, that placement carries its
  // own poster instead (ADR-0015), so no asset is duplicated for a poster.
  const placementPosterOverrides: string[] = [];
  const pairPoster = (videoUrl: string, posterUrl: string, source: string) => {
    const video = checksumOf(mediaKeyFromUrl(videoUrl) ?? "");
    const poster = checksumOf(mediaKeyFromUrl(posterUrl) ?? "");
    if (!video || !poster) return;
    const asset = assets.get(video)!;
    if (asset.posterChecksum === null) asset.posterChecksum = poster;
    else if (asset.posterChecksum !== poster) {
      placementPosterOverrides.push(
        `${source}: ${asset.key} shows ${mediaKeyFromUrl(posterUrl)} here, not its default ` +
          `${assets.get(asset.posterChecksum)?.key}`,
      );
    }
  };
  for (const [slug, detail] of details) {
    if (detail.film) pairPoster(detail.film.src, detail.film.poster.src, `projects/${slug}: film`);
    if (detail.loop) pairPoster(detail.loop.src, detail.loop.poster.src, `projects/${slug}: loop`);
  }
  pairPoster(home.hero.video, home.hero.poster.src, "home: hero");
  home.wall.items.forEach((item, i) => {
    if (item.video) pairPoster(item.video, item.poster.src, `home: wall ${i + 1}`);
  });

  const ref = (url: string, altText: string | null, posterUrl?: string): DesiredBlockMedia => {
    const checksum = checksumOf(mediaKeyFromUrl(url) ?? "") ?? "(missing)";
    const poster = posterUrl ? checksumOf(mediaKeyFromUrl(posterUrl) ?? "") : null;
    const inherited = assets.get(checksum)?.posterChecksum ?? null;
    return { checksum, altText, posterChecksum: poster && poster !== inherited ? poster : null };
  };

  const desiredProjects = works.map((project: WorksProject, displayPosition): DesiredProject => {
    const detail = details.get(project.slug) ?? null;
    return {
      slug: project.slug,
      title: project.title,
      year: project.year,
      displayPosition,
      coverChecksum: ref(project.cover.src, null).checksum,
      previewChecksum: project.preview ? ref(project.preview, null).checksum : null,
      client: detail?.client ?? null,
      role: detail?.role ?? null,
      runtime: detail?.runtime ?? null,
      credits: detail?.credits ?? [],
      blocks: detail ? projectBlocksFrom(detail, ref) : [],
    };
  });

  const homeBlocks = homeBlocksFrom(home, ref);

  // Every composition must pass the same validation the site applies on read.
  const validate = (blocks: DesiredBlock[], owner: "project" | "page", where: string) => {
    for (const block of blocks) {
      for (const [candidate, parentType] of [
        [block, null],
        ...block.children.map((c) => [c, block.type] as const),
      ] as const) {
        try {
          parseBlock({ type: candidate.type, content: candidate.content, config: candidate.config }, { owner, parentType });
        } catch (error) {
          issues.push(`${where}: ${(error as Error).message}`);
        }
      }
    }
  };
  desiredProjects.forEach((p) => validate(p.blocks, "project", `projects/${p.slug}`));
  validate(homeBlocks, "page", "home");

  return {
    inventory: { placements, files, missing, dimensionMismatches, duplicateGroups, placementPosterOverrides },
    assets: [...assets.values()],
    projects: desiredProjects,
    home: homeBlocks,
    issues,
  };
}

// The 1B composition of ADR-0013, as the locked Project Detail page renders it.
type Ref = (url: string, alt: string | null, posterUrl?: string) => DesiredBlockMedia;

function projectBlocksFrom(detail: ProjectDetail, ref: Ref) {
  const blocks: DesiredBlock[] = [];
  if (detail.film) {
    blocks.push({
      type: "HERO",
      content: {},
      config: {
        playback: { mode: "CLICK_TO_PLAY" },
        fit: "COVER",
        overlay: { enabled: true, anchor: "bottom-start", colStart: 1, colSpan: 8, showBackToWorks: true },
      },
      media: [ref(detail.film.src, detail.film.poster.alt, detail.film.poster.src)],
      children: [],
    });
  }
  blocks.push({
    type: "GRID",
    content: {},
    config: { preset: "projectMeta" },
    media: [],
    children: [
      {
        type: "TEXT",
        content: { kind: "projectFacts" },
        config: { placement: { desktop: { colStart: 1, colSpan: 3 } } },
        media: [],
        children: [],
      },
      ...(detail.statement
        ? [TEXT("statement", [[detail.statement.lead], [detail.statement.body]], { colStart: 5, colSpan: 6 })]
        : []),
    ],
  });
  if (detail.stills.length) {
    blocks.push({
      type: "GRID",
      content: {},
      config: { preset: "projectStills" },
      media: [],
      children: detail.stills.map((still, i) => ({
        type: "IMAGE" as const,
        content: {},
        config: { placement: { desktop: { colStart: 1 + 3 * (i % 4), colSpan: 3 } } },
        media: [ref(still.src, still.alt)],
        children: [],
      })),
    });
  }
  if (detail.loop) {
    blocks.push({
      type: "GRID",
      content: {},
      config: { preset: "projectLoop" },
      media: [],
      children: [
        {
          type: "VIDEO",
          content: {},
          config: {
            playback: { mode: "AUTOPLAY_VISIBLE" },
            fit: "COVER",
            placement: { desktop: { colStart: 1, colSpan: 8 } },
          },
          media: [ref(detail.loop.src, detail.loop.poster.alt, detail.loop.poster.src)],
          children: [],
        },
        TEXT("caption", [[detail.loop.caption]], { colStart: 10, colSpan: 3 }),
      ],
    });
  }
  if (detail.credits.length) {
    blocks.push({
      type: "GRID",
      content: {},
      config: { preset: "projectCredits" },
      media: [],
      children: [
        {
          type: "TEXT",
          content: { kind: "projectCredits" },
          config: { placement: { desktop: { colStart: 1, colSpan: 3 } } },
          media: [],
          children: [],
        },
      ],
    });
  }
  if (detail.coda) {
    blocks.push({
      type: "IMAGE",
      content: {},
      config: { fit: "COVER", preset: "projectCoda" },
      media: [ref(detail.coda.src, detail.coda.alt)],
      children: [],
    });
  }
  return blocks;
}

// Home's default composition (ADR-0007), as the locked Home page renders it.
// The footer is site chrome, not a block, and stays static.
function homeBlocksFrom(home: HomeTemplate, ref: Ref) {
  return [
    {
      type: "HERO",
      content: { caption: home.hero.caption },
      config: { playback: { mode: "AUTOPLAY_AMBIENT" }, fit: "COVER" },
      media: [ref(home.hero.video, home.hero.poster.alt, home.hero.poster.src)],
      children: [],
    },
    {
      type: "GRID",
      content: {},
      config: { preset: "homeIdentity" },
      media: [],
      children: [
        TEXT("display", [[home.identity.display]], { colStart: 1, colSpan: 12 }),
        TEXT("lead", [[home.identity.lead]], { colStart: 1, colSpan: 5 }),
        TEXT("aside", [[home.identity.aside]], { colStart: 9, colSpan: 4 }),
      ],
    },
    {
      type: "GALLERY",
      content: { label: home.wall.label },
      config: {
        mode: "VIDEO_GRID",
        columns: { desktop: 3, tablet: 2, mobile: 2 },
        playback: { mode: "AUTOPLAY_VISIBLE" },
        fit: "COVER",
        preset: "homeWall",
      },
      media: home.wall.items.map((item) =>
        item.video ? ref(item.video, item.poster.alt, item.poster.src) : ref(item.poster.src, item.poster.alt),
      ),
      children: [],
    },
    {
      type: "GRID",
      content: {},
      config: { preset: "homeAbout" },
      media: [],
      children: [
        TEXT("body", [[home.about.text]], { colStart: 1, colSpan: 6 }),
        TEXT("more", [[{ link: { href: home.about.more.href, text: home.about.more.label } }]], { colStart: 1, colSpan: 6 }),
        {
          type: "IMAGE",
          content: {},
          config: { placement: { desktop: { colStart: 10, colSpan: 3 } } },
          media: [ref(home.about.portrait.src, home.about.portrait.alt)],
          children: [],
        },
      ],
    },
    {
      type: "GALLERY",
      content: { label: home.coda.label },
      config: { mode: "JUSTIFIED_ROWS" },
      media: home.coda.items.map((item) => ref(item.src, item.alt)),
      children: [],
    },
  ] satisfies DesiredBlock[];
}

// ---- Applying the plan ----

export type ImportReport = {
  operations: string[];
  created: number;
  unchanged: number;
  drift: string[];
  written: boolean;
};

const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

type Owner = { projectId: string } | { pageId: string };

// A stored composition in the importer's comparable shape, hidden blocks
// included, since a hidden block is still an edit to preserve.
async function readTree(db: Database, owner: Owner, checksumById: Map<string, string>) {
  const where =
    "projectId" in owner ? eq(projectBlocks.projectId, owner.projectId) : eq(projectBlocks.pageId, owner.pageId);
  const columns = {
    id: projectBlocks.id,
    parentBlockId: projectBlocks.parentBlockId,
    type: projectBlocks.type,
    isHidden: projectBlocks.isHidden,
    content: projectBlocks.content,
    config: projectBlocks.config,
  };
  const roots = await db
    .select(columns)
    .from(projectBlocks)
    .where(and(where, isNull(projectBlocks.parentBlockId)))
    .orderBy(asc(projectBlocks.position));
  if (!roots.length) return [];
  const children = await db
    .select(columns)
    .from(projectBlocks)
    .where(inArray(projectBlocks.parentBlockId, roots.map((r) => r.id)))
    .orderBy(asc(projectBlocks.position));
  const items = await db
    .select({
      blockId: blockMedia.blockId,
      mediaId: blockMedia.mediaId,
      altText: blockMedia.altText,
      posterMediaId: blockMedia.posterMediaId,
    })
    .from(blockMedia)
    .where(inArray(blockMedia.blockId, [...roots, ...children].map((b) => b.id)))
    .orderBy(asc(blockMedia.position));
  const shape = (block: (typeof roots)[number]): DesiredBlock & { hidden: boolean } => ({
    type: block.type,
    content: block.content,
    config: block.config,
    media: items
      .filter((item) => item.blockId === block.id)
      .map((item) => ({
        checksum: checksumById.get(item.mediaId) ?? item.mediaId,
        altText: item.altText,
        posterChecksum: item.posterMediaId ? checksumById.get(item.posterMediaId) ?? item.posterMediaId : null,
      })),
    children: children.filter((c) => c.parentBlockId === block.id).map(shape),
    hidden: block.isHidden,
  });
  return roots.map(shape);
}

const withHidden = (blocks: DesiredBlock[]): unknown =>
  blocks.map((block) => ({ ...block, children: withHidden(block.children), hidden: false }));

async function insertTree(
  db: Database,
  owner: Owner,
  blocks: DesiredBlock[],
  mediaIdByChecksum: Map<string, string>,
  parentBlockId: string | null = null,
) {
  for (const [position, block] of blocks.entries()) {
    const [row] = await db
      .insert(projectBlocks)
      .values({
        ...(parentBlockId ? { parentBlockId } : owner),
        type: block.type,
        position,
        content: block.content,
        config: block.config,
      })
      .returning({ id: projectBlocks.id });
    if (block.media.length) {
      await db.insert(blockMedia).values(
        block.media.map((item, i) => ({
          blockId: row.id,
          mediaId: mediaIdByChecksum.get(item.checksum)!,
          position: i,
          altText: item.altText,
          posterMediaId: item.posterChecksum ? mediaIdByChecksum.get(item.posterChecksum)! : null,
        })),
      );
    }
    await insertTree(db, owner, block.children, mediaIdByChecksum, row.id);
  }
}

// Compares the plan with the database and, when `write` is true, creates what
// is missing inside one transaction. With `write` false nothing is written.
export async function applyImportPlan(db: Database, plan: ImportPlan, write: boolean): Promise<ImportReport> {
  if (write && plan.issues.length) throw new Error(`The import plan has ${plan.issues.length} issue(s); nothing written.`);

  const run = async (tx: Database): Promise<ImportReport> => {
    const report: ImportReport = { operations: [], created: 0, unchanged: 0, drift: [], written: write };
    const create = (what: string) => {
      report.operations.push(`create ${what}`);
      report.created += 1;
    };
    const same = () => (report.unchanged += 1);
    const drift = (what: string) => report.drift.push(what);

    // Media, by content identity.
    const checksums = plan.assets.map((asset) => asset.checksum);
    const existingMedia = checksums.length
      ? await tx
          .select({
            id: media.id,
            checksum: media.checksumSha256,
            storageKey: media.storageKey,
            type: media.type,
            width: media.width,
            height: media.height,
            durationMs: media.durationMs,
            posterMediaId: media.posterMediaId,
          })
          .from(media)
          .where(and(inArray(media.checksumSha256, checksums), isNull(media.deletedAt)))
      : [];
    const mediaIdByChecksum = new Map(existingMedia.map((m) => [m.checksum!, m.id]));
    for (const asset of plan.assets) {
      const found = existingMedia.find((m) => m.checksum === asset.checksum);
      if (!found) {
        create(`media ${asset.key} (${asset.type}, ${asset.placements.length} placement copy/copies)`);
        if (write) {
          const [row] = await tx
            .insert(media)
            .values({
              type: asset.type,
              status: "READY",
              storageProvider: "local",
              storageKey: asset.key,
              filename: basename(asset.key),
              originalFilename: basename(asset.key),
              mimeType: asset.mimeType,
              width: asset.width,
              height: asset.height,
              durationMs: asset.durationMs,
              fileSizeBytes: asset.byteSize,
              checksumSha256: asset.checksum,
            })
            .returning({ id: media.id });
          mediaIdByChecksum.set(asset.checksum, row.id);
        }
      } else if (
        found.storageKey !== asset.key ||
        found.type !== asset.type ||
        found.width !== asset.width ||
        found.height !== asset.height ||
        found.durationMs !== asset.durationMs
      ) {
        drift(`media ${asset.key}: the stored asset differs from the file; left unchanged`);
      } else same();
    }

    // Posters: set only where none is set yet.
    const checksumById = new Map([...mediaIdByChecksum].map(([checksum, id]) => [id, checksum]));
    for (const asset of plan.assets.filter((a) => a.posterChecksum)) {
      const found = existingMedia.find((m) => m.checksum === asset.checksum);
      const current = found?.posterMediaId ? checksumById.get(found.posterMediaId) ?? found.posterMediaId : null;
      if (current === asset.posterChecksum) same();
      else if (current) drift(`media ${asset.key}: a different poster is already set; left unchanged`);
      else {
        create(`poster for ${asset.key}`);
        if (write) {
          await tx
            .update(media)
            .set({ posterMediaId: mediaIdByChecksum.get(asset.posterChecksum!)! })
            .where(and(eq(media.id, mediaIdByChecksum.get(asset.checksum)!), isNull(media.posterMediaId)));
        }
      }
    }

    // Projects, by slug; their compositions only when they have none.
    const existingProjects = await tx
      .select()
      .from(projects)
      .where(inArray(projects.slug, plan.projects.map((p) => p.slug)));
    for (const project of plan.projects) {
      const found = existingProjects.find((p) => p.slug === project.slug);
      let projectId = found?.id;
      if (!found) {
        create(`project ${project.slug} (position ${project.displayPosition})`);
        if (write) {
          const [row] = await tx
            .insert(projects)
            .values({
              slug: project.slug,
              title: project.title,
              year: project.year,
              displayPosition: project.displayPosition,
              coverMediaId: mediaIdByChecksum.get(project.coverChecksum)!,
              previewMediaId: project.previewChecksum ? mediaIdByChecksum.get(project.previewChecksum)! : null,
              client: project.client,
              role: project.role,
              runtime: project.runtime,
              credits: project.credits,
              status: "PUBLISHED",
              visibility: "PUBLIC",
              publishedAt: new Date(),
            })
            .returning({ id: projects.id });
          projectId = row.id;
        }
      } else {
        const differs =
          found.title !== project.title ||
          found.year !== project.year ||
          found.displayPosition !== project.displayPosition ||
          (found.coverMediaId ? checksumById.get(found.coverMediaId) : null) !== project.coverChecksum ||
          (found.previewMediaId ? checksumById.get(found.previewMediaId) : null) !== project.previewChecksum ||
          found.client !== project.client ||
          found.role !== project.role ||
          found.runtime !== project.runtime ||
          stable(found.credits) !== stable(project.credits) ||
          found.status !== "PUBLISHED" ||
          found.visibility !== "PUBLIC" ||
          found.deletedAt !== null;
        if (differs) drift(`project ${project.slug}: the stored project differs; left unchanged`);
        else same();
      }
      await syncTree(`project ${project.slug}`, projectId ? { projectId } : null, project.blocks);
    }

    // HOME, which migration 0003 seeds.
    const [homePage] = await tx.select({ id: pages.id }).from(pages).where(eq(pages.key, "HOME"));
    if (!homePage) throw new Error("The HOME page row is missing; apply the database migrations first.");
    await syncTree("page HOME", { pageId: homePage.id }, plan.home);

    // Publications (ADR-0012): the committed content is the live site, so each
    // published project and HOME gets its snapshot, once, through the same
    // validation as a publish from the Studio. An existing snapshot, or a
    // project someone has since unpublished, is left alone.
    const publications = createPublicationRepository(tx);
    for (const project of plan.projects) {
      const [row] = await tx
        .select({ id: projects.id, status: projects.status })
        .from(projects)
        .where(eq(projects.slug, project.slug));
      if (row && (await publications.findProject(row.id))) {
        same();
        continue;
      }
      if (row && row.status !== "PUBLISHED") continue;
      create(`publication of project ${project.slug}`);
      if (write && row) await createProjectPublicationService(tx).publish(row.id, null);
    }
    if (await publications.findPage(homePage.id)) same();
    else {
      create("publication of page HOME");
      if (write) await createPagePublicationService(tx).publish("HOME", null);
    }

    return report;

    async function syncTree(label: string, owner: Owner | null, blocks: DesiredBlock[]) {
      if (!blocks.length) return;
      const stored = owner ? await readTree(tx, owner, checksumById) : [];
      if (!stored.length) {
        create(`${label} composition (${blocks.length} blocks)`);
        if (write && owner) await insertTree(tx, owner, blocks, mediaIdByChecksum);
      } else if (stable(stored) === stable(withHidden(blocks))) same();
      else drift(`${label}: the stored composition differs; left unchanged`);
    }
  };

  return write ? db.transaction((tx) => run(tx as unknown as Database)) : run(db);
}
