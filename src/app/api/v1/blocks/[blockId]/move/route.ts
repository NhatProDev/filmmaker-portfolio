import { moveBlockSchema } from "@/features/project-builder/composition.schema";
import { blockParams } from "../../../_lib/params";
import { adminRoute, json, readJson } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, moveBlockSchema);
    return json({ data: await services(db).composition.move(params.blockId, body) });
  },
  { params: blockParams },
);
