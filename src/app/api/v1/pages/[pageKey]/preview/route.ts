import { draftMode } from "next/headers";
import { pageParams } from "../../../_lib/params";
import { adminRoute } from "../../../_lib/route";
import { services } from "../../../_lib/services";

// Where each page is seen. The site settings show on every page; Home is
// where their footer appears first.
const PUBLIC_PATH = { HOME: "/", ABOUT: "/about", CONTACT: "/contact", SITE: "/" } as const;

export const GET = adminRoute(
  async ({ params, db }) => {
    await services(db).pages.get(params.pageKey);
    (await draftMode()).enable();
    return new Response(null, {
      status: 307,
      headers: { location: PUBLIC_PATH[params.pageKey], "cache-control": "no-store" },
    });
  },
  { params: pageParams },
);
