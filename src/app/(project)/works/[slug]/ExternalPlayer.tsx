"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectExternalVideo } from "@/features/site-content/site-content.types";
import styles from "./blocks.module.css";

// A YouTube or Vimeo video (Phase 3B, ADR-0008 CLICK_TO_PLAY only). Until the
// visitor asks, the frame shows the poster the parent draws beneath (or the
// empty frame) and nothing is requested from the provider. The act loads the
// provider's player, which starts with sound as the act intends, and pauses
// the page's silent loops so only one thing plays with sound.
export function ExternalPlayer({ external, label }: { external: ProjectExternalVideo; label: string }) {
  const [started, setStarted] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  // The play button is replaced by the player: focus follows it, so a
  // keyboard visitor lands in the player rather than at the top (3D-8).
  useEffect(() => {
    if (started) frame.current?.focus();
  }, [started]);
  const provider = external.provider === "youtube" ? "YouTube" : "Vimeo";

  const start = () => {
    document.querySelectorAll<HTMLVideoElement>('video[data-play="visible"]').forEach((loop) => loop.pause());
    setStarted(true);
  };

  return started ? (
    <iframe
      ref={frame}
      className={`${styles.fill} ${styles.embed}`}
      src={external.embedUrl}
      title={external.title || `${provider} video`}
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  ) : (
    <button type="button" className={styles.play} aria-label={`${label} (${provider})`} onClick={start}>
      <span className={styles.playMark} aria-hidden="true" />
    </button>
  );
}
