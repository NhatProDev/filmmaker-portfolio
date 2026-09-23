import { setPasswordSchema } from "@/features/projects/project.schema";
import { projectParams } from "../../../_lib/params";
import { adminRoute, noContent, readJson } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const PUT = adminRoute(
  async ({ request, params, db }) => {
    const { password } = await readJson(request, setPasswordSchema);
    await services(db).projects.setPassword(params.projectId, password);
    return noContent();
  },
  { params: projectParams },
);

export const DELETE = adminRoute(
  async ({ params, db }) => {
    await services(db).projects.removePassword(params.projectId);
    return noContent();
  },
  { params: projectParams },
);
