import { updateAlbumSchema } from "@/features/albums/album.schema";
import { albumParams } from "../../_lib/params";
import { adminRoute, json, noContent, readJson } from "../../_lib/route";
import { services } from "../../_lib/services";

export const GET = adminRoute(async ({ params, db }) => json({ data: await services(db).albums.get(params.albumId) }), {
  params: albumParams,
});

export const PATCH = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, updateAlbumSchema);
    return json({ data: await services(db).albums.update(params.albumId, body) });
  },
  { params: albumParams },
);

// Soft delete: archived and unpublished; its images stay in the library.
export const DELETE = adminRoute(
  async ({ params, db }) => {
    await services(db).albums.softDelete(params.albumId);
    return noContent();
  },
  { params: albumParams },
);
