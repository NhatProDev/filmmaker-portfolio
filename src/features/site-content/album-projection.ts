import { albumSnapshotSchema, type AlbumSnapshot } from "@/features/albums/album.snapshot";
import { ContentProjectionError, createMediaIndex, image, type MediaIndex } from "./db-projection";
import type { AlbumCard, AlbumPage, AlbumsIndex } from "./site-content.types";

// Published albums (ADR-0019) projected onto the public album pages. An album
// the page cannot show faithfully is refused, never repaired.

function fail(where: string, message: string): never {
  throw new ContentProjectionError(`${where}: ${message}`);
}

export function parseAlbumSnapshot(value: unknown, where: string): AlbumSnapshot {
  const parsed = albumSnapshotSchema.safeParse(value);
  if (!parsed.success) fail(where, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return parsed.data as AlbumSnapshot;
}

const altOf = (index: MediaIndex, mediaId: string, altText: string | null) => altText ?? index.get(mediaId)?.altText ?? "";

export function renderAlbum(snapshot: AlbumSnapshot, slug: string, related: AlbumPage["related"], url?: MediaIndex["url"]): AlbumPage {
  const where = `album ${slug}`;
  const index = createMediaIndex(snapshot.media, url);
  if (!snapshot.items.length) fail(where, "an album needs at least one image");
  const items = snapshot.items.map((item) => {
    const { src, width, height, alt, activeAspect } = image(index, item.mediaId, altOf(index, item.mediaId, item.altText), `${where}, image ${item.position + 1}`);
    // ADR-0016: the rows frame a letterboxed still on its active picture.
    return { image: { src, width, height, alt, ...(activeAspect ? { activeAspect } : {}) }, caption: item.caption };
  });
  const coverId = snapshot.album.coverMediaId;
  const cover = coverId ? image(index, coverId, "", `${where}, cover`) : null;
  const { title, description, collection, seoTitle, seoDescription } = snapshot.album;
  return {
    slug,
    title,
    description,
    collection,
    cover: cover ? { src: cover.src, width: cover.width, height: cover.height, alt: "" } : { ...items[0].image, alt: "" },
    items,
    related,
    seo: { ...(seoTitle ? { title: seoTitle } : {}), ...((seoDescription ?? description) ? { description: (seoDescription ?? description)! } : {}) },
  };
}

// Empty when the album can be published and renders on its page.
export function albumIssues(value: unknown, slug: string): string[] {
  try {
    renderAlbum(parseAlbumSnapshot(value, `album ${slug}`), slug, null);
    return [];
  } catch (error) {
    if (error instanceof ContentProjectionError) return [error.message];
    throw error;
  }
}

// The index: albums in display order, grouped by collection in order of
// first appearance (ADR-0019 §2).
export function albumsIndex(albums: AlbumPage[]): AlbumsIndex {
  const groups: AlbumsIndex["collections"] = [];
  for (const album of albums) {
    const card: AlbumCard = { slug: album.slug, title: album.title, cover: album.cover, count: album.items.length };
    const group = groups.find((g) => g.name === album.collection);
    if (group) group.albums.push(card);
    else groups.push({ name: album.collection, albums: [card] });
  }
  return { collections: groups };
}
