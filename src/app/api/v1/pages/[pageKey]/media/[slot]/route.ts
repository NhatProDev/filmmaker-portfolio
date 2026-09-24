import { z } from "zod";
import { setPageSlotSchema } from "@/features/page-content/page-content.schema";
import { createPageContentService } from "@/features/page-content/page-content.service";
import { findPage } from "@/features/project-builder/page.service";
import { contentPageParams } from "../../../../_lib/params";
import { adminRoute, json, readJson } from "../../../../_lib/route";
import { services } from "../../../../_lib/services";

// One image slot of a structured page (ADR-0017). The slot set is closed per
// page; the service refuses any other name.
const params = contentPageParams.extend({ slot: z.string().regex(/^[a-z][a-zA-Z0-9]{0,49}$/) });

export const PUT = adminRoute(
  async ({ request, params: { pageKey, slot }, db }) => {
    const body = await readJson(request, setPageSlotSchema);
    await createPageContentService(db).setSlot(await findPage(db, pageKey), slot, body);
    return json({ data: await services(db).pages.getStructured(pageKey) });
  },
  { params },
);

export const DELETE = adminRoute(
  async ({ params: { pageKey, slot }, db }) => {
    await createPageContentService(db).clearSlot(await findPage(db, pageKey), slot);
    return json({ data: await services(db).pages.getStructured(pageKey) });
  },
  { params },
);
