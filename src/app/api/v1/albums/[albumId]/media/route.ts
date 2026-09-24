import { addAlbumMediaSchema } from "@/features/albums/album.schema";
import { albumParams } from "../../../_lib/params";
import { adminRoute, json, readJson } from "../../../_lib/route";
import { services } from "../../../_lib/services";

// Places a Media Library image in the album (ADR-0005 insertion).
export const POST = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, addAlbumMediaSchema);
    return json({ data: await services(db).albums.addItem(params.albumId, body) }, 201);
  },
  { params: albumParams },
);
