import { blockParams } from "../../../_lib/params";
import { adminRoute, json } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ params, db }) => json({ data: await services(db).composition.duplicate(params.blockId) }, 201),
  { params: blockParams },
);
