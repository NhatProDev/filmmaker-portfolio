import type { MediaDto, MediaRefDto } from "@/features/media/media.mapper";

// An image the Studio may show: its public URL, or — for a ready private
// original, which has none — the admin-only, signed route (Phase 3B,
// ADR-0020). Only a private asset goes to that route: an asset recorded under
// another storage provider has no URL here either, and the route would
// refuse it.
function imageUrl(media: MediaDto | MediaRefDto): string | null {
  if (media.deliveryUrl) return media.deliveryUrl;
  return media.type === "IMAGE" && media.status === "READY" && media.isPrivate ? `/api/v1/media/${media.id}/content` : null;
}

// What to show for an asset: an image itself, a video's poster.
export function thumbnailUrl(media: MediaDto | MediaRefDto | null | undefined): string | null {
  if (!media) return null;
  if (media.type === "IMAGE") return imageUrl(media);
  return "poster" in media && media.poster ? imageUrl(media.poster) : null;
}
