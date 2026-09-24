import { z } from "zod";
import type { Database } from "@db/client";
import { createMediaRepository, type MediaRecord } from "@/features/media/media.repository";
import { snapshotMediaSchema } from "@/features/project-builder/snapshot";
import { createAlbumRepository, type AlbumRow } from "./album.repository";

// An album as it is published (ADR-0012, ADR-0019): its editorial fields, its
// images in order and the media records they need. Slug, status, order and
// the related project stay live on the album row and are never snapshotted.

const uuid = z.uuid();

export const albumSnapshotSchema = z.strictObject({
  version: z.literal(1),
  album: z.strictObject({
    id: uuid,
    title: z.string().min(1),
    description: z.string().nullable(),
    collection: z.string().nullable(),
    seoTitle: z.string().nullable(),
    seoDescription: z.string().nullable(),
    coverMediaId: uuid.nullable(),
  }),
  items: z.array(
    z.strictObject({
      id: uuid,
      mediaId: uuid,
      position: z.int().min(0),
      altText: z.string().nullable(),
      caption: z.string().nullable(),
    }),
  ),
  media: z.array(snapshotMediaSchema),
});

export type AlbumSnapshot = z.infer<typeof albumSnapshotSchema> & { media: MediaRecord[] };

export async function buildAlbumSnapshot(db: Database, row: AlbumRow): Promise<AlbumSnapshot> {
  const items = await createAlbumRepository(db).listItems(row.id);
  const ids = [...new Set([...items.map((item) => item.mediaId), ...(row.coverMediaId ? [row.coverMediaId] : [])])];
  const media = await createMediaRepository(db).findLiveByIds(ids);
  return {
    version: 1,
    album: {
      id: row.id,
      title: row.title,
      description: row.description,
      collection: row.collection,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      coverMediaId: row.coverMediaId,
    },
    items: items.map((item) => ({ id: item.id, mediaId: item.mediaId, position: item.position, altText: item.altText, caption: item.caption })),
    media: media.sort((a, b) => a.id.localeCompare(b.id)),
  };
}
