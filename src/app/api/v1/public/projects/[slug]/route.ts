import { accessCookieName } from "@/features/project-access/project-access.service";
import { DomainError } from "@/lib/errors/domain-error";
import { readCookie } from "@/lib/http/request";
import { slugParams } from "../../../_lib/params";
import { json, publicRoute } from "../../../_lib/route";
import { services } from "../../../_lib/services";

// A published project. A PRIVATE one needs a valid access cookie; without it
// the response is 403 and carries nothing of the project (ADR-0003).
export const GET = publicRoute(
  async ({ request, params, db }) => {
    const { publicProjects, access } = services(db);
    const cookie = readCookie(request, accessCookieName(params.slug));
    const project = await publicProjects.get(
      params.slug,
      async (projectId) => (await access.verify(params.slug, cookie))?.projectId === projectId,
    );
    if (!project) throw new DomainError("NOT_FOUND", "PROJECT_NOT_FOUND", "Project not found.");
    if (project === "locked") {
      throw new DomainError("FORBIDDEN", "PROJECT_LOCKED", "This project needs its access password.");
    }
    return json({ data: project });
  },
  { params: slugParams },
);
