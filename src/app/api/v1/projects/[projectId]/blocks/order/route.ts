import { reorderBlocksSchema } from "@/features/project-builder/composition.schema";
import { projectParams } from "../../../../_lib/params";
import { adminRoute, noContent, readJson } from "../../../../_lib/route";
import { services } from "../../../../_lib/services";

export const PUT = adminRoute(
  async ({ request, params, db }) => {
    const { parentBlockId, blockIds } = await readJson(request, reorderBlocksSchema);
    await services(db).composition.reorder({ kind: "project", id: params.projectId }, parentBlockId, blockIds);
    return noContent();
  },
  { params: projectParams },
);
