import { albumParams } from "../../../_lib/params";
import { adminRoute, json } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ params, db }) => json({ data: await services(db).albums.unpublish(params.albumId) }),
  { params: albumParams },
);
