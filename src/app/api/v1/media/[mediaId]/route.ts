import { updateMediaSchema } from "@/features/media/media.schema";
import { mediaParams } from "../../_lib/params";
import { adminRoute, json, noContent, readJson } from "../../_lib/route";
import { services } from "../../_lib/services";

export const GET = adminRoute(async ({ params, db }) => json({ data: await services(db).media.get(params.mediaId) }), {
  params: mediaParams,
});

export const PATCH = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, updateMediaSchema);
    return json({ data: await services(db).media.update(params.mediaId, body) });
  },
  { params: mediaParams },
);

export const DELETE = adminRoute(
  async ({ params, db }) => {
    await services(db).media.softDelete(params.mediaId);
    return noContent();
  },
  { params: mediaParams },
);
