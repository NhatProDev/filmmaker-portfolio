import { reorderAlbumsSchema } from "@/features/albums/album.schema";
import { adminRoute, noContent, readJson } from "../../_lib/route";
import { services } from "../../_lib/services";

// The complete order of every live album, in one transaction (ADR-0002).
export const PUT = adminRoute(async ({ request, db }) => {
  const { albumIds } = await readJson(request, reorderAlbumsSchema);
  await services(db).albums.reorder(albumIds);
  return noContent();
});
