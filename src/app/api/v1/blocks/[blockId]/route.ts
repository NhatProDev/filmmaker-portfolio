import { updateBlockSchema } from "@/features/project-builder/composition.schema";
import { blockParams } from "../../_lib/params";
import { adminRoute, json, noContent, readJson } from "../../_lib/route";
import { services } from "../../_lib/services";

export const PATCH = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, updateBlockSchema);
    return json({ data: await services(db).composition.update(params.blockId, body) });
  },
  { params: blockParams },
);

export const DELETE = adminRoute(
  async ({ params, db }) => {
    await services(db).composition.remove(params.blockId);
    return noContent();
  },
  { params: blockParams },
);
