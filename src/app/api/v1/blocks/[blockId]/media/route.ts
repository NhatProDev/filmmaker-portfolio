import { addBlockMediaSchema } from "@/features/project-builder/composition.schema";
import { blockParams } from "../../../_lib/params";
import { adminRoute, json, readJson } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, addBlockMediaSchema);
    return json({ data: await services(db).composition.addMedia(params.blockId, body) }, 201);
  },
  { params: blockParams },
);
