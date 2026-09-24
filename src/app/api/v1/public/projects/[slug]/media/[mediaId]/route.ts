import { z } from "zod";
import { createMediaRepository } from "@/features/media/media.repository";
import { accessCookieName } from "@/features/project-access/project-access.service";
import { createPublicationRepository } from "@/features/project-builder/publication.repository";
import { DomainError } from "@/lib/errors/domain-error";
import { readCookie } from "@/lib/http/request";
import { deliverMedia } from "../../../../../_lib/deliver-media";
import { publicRoute, slugParam, uuidParam } from "../../../../../_lib/route";
import { services } from "../../../../../_lib/services";

const params = z.object({ slug: slugParam, mediaId: uuidParam });

const notFound = () => new DomainError("NOT_FOUND", "NOT_FOUND", "Not found.");

// Delivers one asset of a PRIVATE project to a visitor holding valid access,
// and only an asset the project's published snapshot references (ADR-0014 §4).
// Everything else is 404, so nothing about an asset is revealed. A storage
// provider serves the bytes itself: the visitor is redirected to a short-lived
// signed URL, so large private video never passes through the application.
// The local adapter streams the file, with byte ranges for video. Access is
// re-checked on every request, so a signed URL outlives a revoked grant by at
// most MEDIA_SIGNED_URL_TTL_SECONDS.
export const GET = publicRoute(
  async ({ request, params: { slug, mediaId }, db }) => {
    const grant = await services(db).access.verify(slug, readCookie(request, accessCookieName(slug)));
    if (!grant) throw notFound();
    if (!(await createPublicationRepository(db).projectReferences(grant.projectId, mediaId))) throw notFound();
    const asset = await createMediaRepository(db).findById(mediaId);
    if (!asset) throw notFound();
    return deliverMedia(request, asset, notFound);
  },
  { params },
);
