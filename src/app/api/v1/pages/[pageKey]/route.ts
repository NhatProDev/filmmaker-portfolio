import { updatePageContentSchema } from "@/features/page-content/page-content.schema";
import { createPageContentService } from "@/features/page-content/page-content.service";
import { findPage } from "@/features/project-builder/page.service";
import { contentPageParams, pageParams } from "../../_lib/params";
import { adminRoute, json, readJson } from "../../_lib/route";
import { services } from "../../_lib/services";

export const GET = adminRoute(async ({ params, db }) => json({ data: await services(db).pages.get(params.pageKey) }), {
  params: pageParams,
});

// A structured page's working copy (ADR-0017): its content, validated whole.
export const PATCH = adminRoute(
  async ({ request, params, db }) => {
    const { content } = await readJson(request, updatePageContentSchema);
    await createPageContentService(db).updateContent(await findPage(db, params.pageKey), content);
    return json({ data: await services(db).pages.getStructured(params.pageKey) });
  },
  { params: contentPageParams },
);
