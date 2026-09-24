import Image from "next/image";
import type { MediaDto } from "@/features/media/media.mapper";
import styles from "../studio.module.css";

export { thumbnailUrl } from "./thumbnail";

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
