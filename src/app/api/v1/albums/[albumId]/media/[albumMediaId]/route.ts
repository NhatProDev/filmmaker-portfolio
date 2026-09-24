import { updateAlbumMediaSchema } from "@/features/albums/album.schema";
import { albumMediaParams } from "../../../../_lib/params";
import { adminRoute, json, noContent, readJson } from "../../../../_lib/route";
import { services } from "../../../../_lib/services";

export const PATCH = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, updateAlbumMediaSchema);
    return json({ data: await services(db).albums.updateItem(params.albumId, params.albumMediaId, body) });
  },
  { params: albumMediaParams },
);

// Removes the image from the album; the asset stays in the Media Library.
export const DELETE = adminRoute(
  async ({ params, db }) => {
    await services(db).albums.removeItem(params.albumId, params.albumMediaId);
    return noContent();
  },
  { params: albumMediaParams },
);
