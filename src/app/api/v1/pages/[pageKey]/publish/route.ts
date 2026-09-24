import { pageParams } from "../../../_lib/params";
import { adminRoute, json } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ params, db, admin }) => {
    const { pagePublication, pages } = services(db);
    await pagePublication.publish(params.pageKey, admin.id);
    return json({ data: await pages.get(params.pageKey) });
  },
  { params: pageParams },
);
