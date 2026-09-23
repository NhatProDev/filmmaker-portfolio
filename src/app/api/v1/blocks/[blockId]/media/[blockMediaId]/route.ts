import { updateBlockMediaSchema } from "@/features/project-builder/composition.schema";
import { blockMediaParams } from "../../../../_lib/params";
import { adminRoute, json, noContent, readJson } from "../../../../_lib/route";
import { services } from "../../../../_lib/services";

export const PATCH = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, updateBlockMediaSchema);
    return json({ data: await services(db).composition.updateMedia(params.blockId, params.blockMediaId, body) });
  },
  { params: blockMediaParams },
);

export const DELETE = adminRoute(
  async ({ params, db }) => {
    await services(db).composition.removeMedia(params.blockId, params.blockMediaId);
    return noContent();
  },
  { params: blockMediaParams },
);
