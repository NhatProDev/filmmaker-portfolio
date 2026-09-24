import { completeUploadSchema } from "@/features/media/media.schema";
import { mediaParams } from "../../../_lib/params";
import { adminRoute, json, readJson } from "../../../_lib/route";
import { services } from "../../../_lib/services";

// The body is optional: what the browser measured of the uploaded file.
export const POST = adminRoute(
  async ({ request, params, db }) => {
    const declared = (await readJson(request, completeUploadSchema.optional())) ?? {};
    return json({ data: await services(db).media.completeUpload(params.mediaId, declared) });
  },
  { params: mediaParams },
);
