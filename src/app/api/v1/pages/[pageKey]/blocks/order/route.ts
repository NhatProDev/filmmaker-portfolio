import { reorderBlocksSchema } from "@/features/project-builder/composition.schema";
import { composedPageParams } from "../../../../_lib/params";
import { adminRoute, noContent, readJson } from "../../../../_lib/route";
import { services } from "../../../../_lib/services";

export const PUT = adminRoute(
  async ({ request, params, db }) => {
    const { parentBlockId, blockIds } = await readJson(request, reorderBlocksSchema);
    const { pages, composition } = services(db);
    await composition.reorder(await pages.owner(params.pageKey), parentBlockId, blockIds);
    return noContent();
  },
  { params: composedPageParams },
);
