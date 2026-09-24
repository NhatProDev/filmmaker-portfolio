import { draftMode } from "next/headers";
import { albumParams } from "../../../_lib/params";
import { adminRoute } from "../../../_lib/route";
import { services } from "../../../_lib/services";

// Opens the working copy on the real public page (ADR-0012). The public page
// honours preview only together with a valid admin session.
export const GET = adminRoute(
  async ({ params, db }) => {
    const album = await services(db).albums.get(params.albumId);
    (await draftMode()).enable();
    return new Response(null, { status: 307, headers: { location: `/albums/${album.slug}`, "cache-control": "no-store" } });
  },
  { params: albumParams },
);
