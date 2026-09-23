import { createBlockSchema } from "@/features/project-builder/composition.schema";
import { projectParams } from "../../../_lib/params";
import { adminRoute, json, readJson } from "../../../_lib/route";
import { services } from "../../../_lib/services";

export const POST = adminRoute(
  async ({ request, params, db }) => {
    const body = await readJson(request, createBlockSchema);
    const block = await services(db).composition.create({ kind: "project", id: params.projectId }, body);
    return json({ data: block }, 201);
  },
  { params: projectParams },
);
