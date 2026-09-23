import { createProjectSchema, listProjectsQuerySchema } from "@/features/projects/project.schema";
import { adminRoute, json, paginationQuery, readJson, readQuery } from "../_lib/route";
import { services } from "../_lib/services";

export const GET = adminRoute(async ({ request, db }) => {
  const query = readQuery(request, listProjectsQuerySchema.extend(paginationQuery));
  return json(await services(db).projects.list(query));
});

export const POST = adminRoute(async ({ request, db }) => {
  const body = await readJson(request, createProjectSchema);
  return json({ data: await services(db).projects.create(body) }, 201);
});

