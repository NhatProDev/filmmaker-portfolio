import { createBlockSchema } from "@/features/project-builder/composition.schema";
import { composedPageParams } from "../../../_lib/params";
import { adminRoute, json, readJson } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, createBlockSchema);
    const { pages, composition } = services(db);
    return json({ data: await composition.create(await pages.owner(params.pageKey), body) }, 201);
  },
  { params: composedPageParams },
);
