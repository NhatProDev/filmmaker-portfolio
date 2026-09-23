import Image from "next/image";
import type { MediaDto, MediaRefDto } from "@/features/media/media.mapper";
import styles from "../studio.module.css";

// What to show for an asset: an image itself, a video's poster.
export function thumbnailUrl(media: MediaDto | MediaRefDto | null | undefined): string | null {
  if (!media) return null;
  if (media.type === "IMAGE") return media.deliveryUrl;
  return "poster" in media ? (media.poster?.deliveryUrl ?? null) : null;
}

export function mediaLabel(media: MediaDto): string {
  if (media.type === "EXTERNAL_VIDEO") return media.externalUrl ?? "External video";
  return media.storageKey?.split("/").pop() ?? media.filename ?? media.id;
}

export function Thumb({ src, large = false, label }: { src: string | null; large?: boolean; label?: string }) {
  const className = large ? styles.thumbLarge : styles.thumb;
  if (!src) {
    return <span className={`${className} ${styles.thumbEmpty}`}>{label ?? "No image"}</span>;
  }
  return <Image className={className} src={src} alt="" width={large ? 160 : 64} height={large ? 100 : 40} unoptimized />;
}
