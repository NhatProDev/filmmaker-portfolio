import { createMediaRepository } from "@/features/media/media.repository";
import { DomainError } from "@/lib/errors/domain-error";
import { deliverMedia } from "../../../_lib/deliver-media";
import { mediaParams } from "../../../_lib/params";
import { adminRoute } from "../../../_lib/route";

const notFound = () => new DomainError("NOT_FOUND", "MEDIA_NOT_FOUND", "Media not found.");

// The Studio's view of an asset that has no public URL, such as a private
// original (Phase 3B): for a signed-in admin only, re-checked on every
// request, answered with a short-lived signed URL (or the streamed file for
// local storage) and never cached. The asset stays private; nothing public is
// created.
export const GET = adminRoute(
  async ({ request, params, db }) => {
    const asset = await createMediaRepository(db).findById(params.mediaId);
    if (!asset || asset.type === "EXTERNAL_VIDEO" || asset.status !== "READY") throw notFound();
    const response = await deliverMedia(request, asset, notFound);
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return response;
  },
  { params: mediaParams },
);
