import { updateProjectSchema } from "@/features/projects/project.schema";
import { projectParams } from "../../_lib/params";
import { adminRoute, json, noContent, readJson } from "../../_lib/route";
import { services } from "../../_lib/services";

export const GET = adminRoute(
  async ({ params, db }) => json({ data: await services(db).projects.get(params.projectId) }),
  { params: projectParams },
);

export const PATCH = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, updateProjectSchema);
    return json({ data: await services(db).projects.update(params.projectId, body) });
  },
  { params: projectParams },
);

export const DELETE = adminRoute(
  async ({ params, db }) => {
    await services(db).projects.softDelete(params.projectId);
    return noContent();
  },
  { params: projectParams },
);
