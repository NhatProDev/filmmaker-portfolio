import { draftMode } from "next/headers";
import { projectParams } from "../../../_lib/params";
import { adminRoute } from "../../../_lib/route";
import { services } from "../../../_lib/services";

// Opens the working copy on the real public page (ADR-0012). The public page
// honours preview only together with a valid admin session.
export const GET = adminRoute(
  async ({ params, db }) => {
    const project = await services(db).projects.get(params.projectId);
    (await draftMode()).enable();
    return new Response(null, { status: 307, headers: { location: `/works/${project.slug}`, "cache-control": "no-store" } });
  },
  { params: projectParams },
);
