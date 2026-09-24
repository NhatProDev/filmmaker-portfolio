import { basename, join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { transaction, type Database } from "@db/client";
import { media, pageMedia, pages } from "@db/schema";
import { committedPages, CONTENT_PAGE_ORDER, type CommittedImage } from "@/features/page-content/committed";
import type { ContentPageKey } from "@/features/page-content/page-content.schema";
import { stableJson } from "@/features/project-builder/snapshot";
import type { ContentGateway } from "@/features/site-content/site-content.types";
import { mediaKeyFromUrl } from "@/lib/storage/media-url";
import { probeMediaFile } from "./media-probe";

// Imports the committed About, Contact and site-settings content into their
// structured pages (ADR-0017), as working copies. Nothing is published:
// visitors keep seeing the committed content until an admin publishes each
// page. Create-only and idempotent, like the main import: a page that already
// has content or slots is compared and reported as drift if it differs, never
// overwritten. Slot images reuse the Media Library asset with the same bytes;
// an asset is created only when none has them.

type DesiredSlot = { slot: string; key: string; altText: string };
type DesiredPage = { key: ContentPageKey; content: unknown; slots: DesiredSlot[] };

export type PageImportReport = {
  pages: { key: ContentPageKey; action: "create" | "unchanged" | "drift"; detail?: string }[];
  mediaCreated: string[];
};

export async function desiredContentPages(gateway: ContentGateway): Promise<DesiredPage[]> {
  const committed = await committedPages(gateway);
  return CONTENT_PAGE_ORDER.map((key) => ({
    key,
    content: committed[key].content,
    slots: Object.entries(committed[key].images as Record<string, CommittedImage>).map(([slot, image]) => {
      const mediaKey = mediaKeyFromUrl(image.src);
      if (!mediaKey) throw new Error(`${slot}: ${image.src} is not a media key`);
      return { slot, key: mediaKey, altText: image.alt };
    }),
  }));
}

export async function importContentPages(
  db: Database,
  gateway: ContentGateway,
  mediaRoot: string,
  write: boolean,
): Promise<PageImportReport> {
  const desired = await desiredContentPages(gateway);
  const report: PageImportReport = { pages: [], mediaCreated: [] };

  // The bytes behind every slot image.
  const files = new Map<string, Extract<Awaited<ReturnType<typeof probeMediaFile>>, { exists: true }>>();
  for (const slot of desired.flatMap((page) => page.slots)) {
    if (files.has(slot.key)) continue;
    const file = await probeMediaFile(join(mediaRoot, slot.key));
    if (!file.exists) throw new Error(`missing file: ${file.path}`);
    if (!file.mimeType.startsWith("image/")) throw new Error(`${slot.key} is not an image`);
    files.set(slot.key, file);
  }

  await transaction(db, async (tx) => {
    // One asset per checksum: the existing one, or a new one from this key.
    const assetFor = async (key: string): Promise<string | null> => {
      const file = files.get(key)!;
      const [found] = await tx
        .select({ id: media.id })
        .from(media)
        .where(and(eq(media.checksumSha256, file.sha256), isNull(media.deletedAt)));
      if (found) return found.id;
      if (!write) {
        report.mediaCreated.push(key);
        return null;
      }
      const [row] = await tx
        .insert(media)
        .values({
          type: "IMAGE",
          status: "READY",
          storageProvider: "local",
          storageKey: key,
          filename: basename(key),
          originalFilename: basename(key),
          mimeType: file.mimeType,
          width: file.width,
          height: file.height,
          fileSizeBytes: file.byteSize,
          checksumSha256: file.sha256,
        })
        .returning({ id: media.id });
      report.mediaCreated.push(key);
      return row.id;
    };

    for (const page of desired) {
      const [row] = await tx.select().from(pages).where(eq(pages.key, page.key));
      if (!row) throw new Error(`page ${page.key} is missing: run npm run db:migrate first`);
      const stored = await tx
        .select({ slot: pageMedia.slot, altText: pageMedia.altText, checksum: media.checksumSha256 })
        .from(pageMedia)
        .innerJoin(media, eq(media.id, pageMedia.mediaId))
        .where(eq(pageMedia.pageId, row.id));
      const untouched = !Object.keys(row.content as object).length && !stored.length;

      if (!untouched) {
        const want = page.slots.map((s) => [s.slot, files.get(s.key)!.sha256, s.altText]).sort();
        const have = stored.map((s) => [s.slot, s.checksum, s.altText]).sort();
        const same = stableJson(row.content) === stableJson(page.content) && stableJson(want) === stableJson(have);
        report.pages.push(
          same ? { key: page.key, action: "unchanged" } : { key: page.key, action: "drift", detail: "the working copy differs from the committed content; left unchanged" },
        );
        continue;
      }

      report.pages.push({ key: page.key, action: "create" });
      const slotRows = [];
      for (const slot of page.slots) slotRows.push({ slot, mediaId: await assetFor(slot.key) });
      if (!write) continue;
      await tx.update(pages).set({ content: page.content }).where(eq(pages.id, row.id));
      for (const { slot, mediaId } of slotRows) {
        await tx.insert(pageMedia).values({ pageId: row.id, slot: slot.slot, mediaId: mediaId!, altText: slot.altText });
      }
    }
  });
  return report;
}
