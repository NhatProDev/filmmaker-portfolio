import { z } from "zod";
import { json, paginationQuery, publicRoute, readQuery } from "../../_lib/route";
import { services } from "../../_lib/services";

const querySchema = z.object({
  ...paginationQuery,
  featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  category: z.string().max(120).optional(),
});

// PUBLIC, published projects only; PRIVATE ones are never listed (ADR-0003).
export const GET = publicRoute(async ({ request, db }) => {
  const query = readQuery(request, querySchema);
  return json(await services(db).publicProjects.list(query), 200, { "cache-control": "public, max-age=60" });
});
