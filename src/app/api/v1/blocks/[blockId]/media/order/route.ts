import { reorderBlockMediaSchema } from "@/features/project-builder/composition.schema";
import { blockParams } from "../../../../_lib/params";
import { adminRoute, noContent, readJson } from "../../../../_lib/route";
import { services } from "../../../../_lib/services";

export const PUT = adminRoute(
  async ({ request, params, db }) => {
    const { blockMediaIds } = await readJson(request, reorderBlockMediaSchema);
    await services(db).composition.reorderMedia(params.blockId, blockMediaIds);
    return noContent();
  },
  { params: blockParams },
);
