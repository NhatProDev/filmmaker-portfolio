import { reorderFeaturedSchema } from "@/features/projects/project.schema";
import { adminRoute, noContent, readJson } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const PUT = adminRoute(async ({ request, db }) => {
  const { projectIds } = await readJson(request, reorderFeaturedSchema);
  await services(db).projects.reorderFeatured(projectIds);
  return noContent();
});
