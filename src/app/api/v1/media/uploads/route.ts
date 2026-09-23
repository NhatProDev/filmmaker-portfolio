import { createUploadSchema } from "@/features/media/media.schema";
import { adminRoute, json, readJson } from "../../_lib/route";
import { services } from "../../_lib/services";

export const POST = adminRoute(async ({ request, db }) => {
  const body = await readJson(request, createUploadSchema);
  return json({ data: await services(db).media.createUpload(body) }, 201);
});
