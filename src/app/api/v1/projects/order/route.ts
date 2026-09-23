import { reorderProjectsSchema } from "@/features/projects/project.schema";
import { adminRoute, noContent, readJson } from "../../_lib/route";
import { services } from "../../_lib/services";

export const PUT = adminRoute(async ({ request, db }) => {
  const { projectIds } = await readJson(request, reorderProjectsSchema);
  await services(db).projects.reorder(projectIds);
  return noContent();
});
