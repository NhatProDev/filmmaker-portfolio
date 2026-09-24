import { reorderAlbumMediaSchema } from "@/features/albums/album.schema";
import { albumParams } from "../../../../_lib/params";
import { adminRoute, noContent, readJson } from "../../../../_lib/route";
import { services } from "../../../../_lib/services";

// The complete order of the album's images, in one transaction (ADR-0002).
export const PUT = adminRoute(
  async ({ request, params, db }) => {
    const { albumMediaIds } = await readJson(request, reorderAlbumMediaSchema);
    await services(db).albums.reorderItems(params.albumId, albumMediaIds);
    return noContent();
  },
  { params: albumParams },
);
