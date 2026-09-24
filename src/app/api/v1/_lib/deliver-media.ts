import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { MediaRow } from "@/features/media/media.mapper";
import { serverEnv } from "@/lib/env/server-env";
import { getMediaStorage } from "@/lib/storage/media-storage";

// Serves one stored asset to a caller the route has already authorised. A
// storage provider serves the bytes itself: the caller is redirected to a
// short-lived signed URL, so large video never passes through the
// application. The local adapter streams the file, with byte ranges for
// video. Nothing is cached by a shared cache. `notFound` is the route's own
// answer for anything it cannot serve, so nothing about the asset leaks.
export async function deliverMedia(
  request: Request,
  asset: Pick<MediaRow, "storageKey" | "storageProvider" | "mimeType">,
  notFound: () => Error,
): Promise<Response> {
  const storage = getMediaStorage();
  if (!asset.storageKey || asset.storageProvider !== storage.provider) throw notFound();

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
}
