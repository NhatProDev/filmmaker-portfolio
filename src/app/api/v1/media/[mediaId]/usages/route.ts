import { mediaParams } from "../../../_lib/params";
import { adminRoute, json } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const GET = adminRoute(async ({ params, db }) => json({ data: await services(db).media.usages(params.mediaId) }), {
  params: mediaParams,
});
