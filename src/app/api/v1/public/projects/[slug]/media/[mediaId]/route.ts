import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { z } from "zod";
import { createMediaRepository } from "@/features/media/media.repository";
import { accessCookieName } from "@/features/project-access/project-access.service";
import { createPublicationRepository } from "@/features/project-builder/publication.repository";
import { DomainError } from "@/lib/errors/domain-error";
import { readCookie } from "@/lib/http/request";
import { serverEnv } from "@/lib/env/server-env";
import { getMediaStorage } from "@/lib/storage/media-storage";
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
    const storage = getMediaStorage();
    if (!asset?.storageKey || asset.storageProvider !== storage.provider) throw notFound();

    const signed = storage.signedDeliveryUrl(asset.storageKey, serverEnv().MEDIA_SIGNED_URL_TTL_SECONDS);
    if (signed) {
      return new Response(null, {
        status: 302,
        headers: { location: signed, "cache-control": "private, no-store", "referrer-policy": "no-referrer" },
      });
    }
    const path = storage.localPath(asset.storageKey);
    if (!path) throw notFound();
    const size = (await stat(path).catch(() => null))?.size;
    if (size === undefined) throw notFound();
    const headers: Record<string, string> = {
      "content-type": asset.mimeType ?? "application/octet-stream",
      "accept-ranges": "bytes",
      // Never stored by a shared cache.
      "cache-control": "private, no-store",
    };

    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      let start = match?.[1] ? Number(match[1]) : NaN;
      let end = match?.[2] ? Number(match[2]) : size - 1;
      if (match && !match[1] && match[2]) {
        start = Math.max(0, size - Number(match[2]));
        end = size - 1;
      }
      if (!match || Number.isNaN(start) || start > end || start >= size) {
        return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
      }
      end = Math.min(end, size - 1);
      const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
      return new Response(body, {
        status: 206,
        headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
      });
    }
    const body = Readable.toWeb(createReadStream(path)) as ReadableStream;
    return new Response(body, { status: 200, headers: { ...headers, "content-length": String(size) } });
  },
  { params },
);
