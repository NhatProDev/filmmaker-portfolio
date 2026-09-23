import { listMediaQuerySchema } from "@/features/media/media.schema";
import { adminRoute, json, paginationQuery, readQuery } from "../_lib/route";
import { services } from "../_lib/services";

export const GET = adminRoute(async ({ request, db }) => {
  const query = readQuery(request, listMediaQuerySchema.extend(paginationQuery));
  return json(await services(db).media.list(query));
});
