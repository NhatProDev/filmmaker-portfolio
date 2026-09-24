import { projectParams } from "../../../_lib/params";
import { adminRoute, json } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ params, db }) => {
    const { projectPublication, projects } = services(db);
    await projectPublication.archive(params.projectId);
    return json({ data: await projects.get(params.projectId) });
  },
  { params: projectParams },
);
