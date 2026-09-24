import { draftMode } from "next/headers";
import { pageParams } from "../../../_lib/params";
import { adminRoute } from "../../../_lib/route";
import { services } from "../../../_lib/services";

const PUBLIC_PATH = { HOME: "/" } as const;

export const GET = adminRoute(
  async ({ params, db }) => {
    await services(db).pages.owner(params.pageKey);
    (await draftMode()).enable();
    return new Response(null, {
      status: 307,
      headers: { location: PUBLIC_PATH[params.pageKey], "cache-control": "no-store" },
    });
  },
  { params: pageParams },
);
