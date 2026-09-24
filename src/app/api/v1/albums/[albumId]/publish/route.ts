import { albumParams } from "../../../_lib/params";
import { adminRoute, json } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ params, db, admin }) => json({ data: await services(db).albums.publish(params.albumId, admin.id) }),
  { params: albumParams },
);
