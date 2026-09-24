"use client";

import { useRef, useState, type CSSProperties } from "react";
import styles from "./blocks.module.css";

// CLICK_TO_PLAY for a video block other than the opening film (ADR-0008): the
// poster (drawn beneath by the parent) until the visitor asks, then the film
// with its controls and sound. Nothing loads before the act; the act pauses
// the page's silent loops, so only one thing plays with sound.
export function ClickToPlay({ src, label, layer }: { src: string; label: string; layer?: { className: string; style: CSSProperties } }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = () => {
    const video = ref.current;
    if (!video || started) return;
    document.querySelectorAll<HTMLVideoElement>('video[data-play="visible"]').forEach((loop) => loop.pause());
    video.setAttribute("src", src);
    video.preload = "auto";
    video.load();
    video.playsInline = true;
    video.controls = true;
    video.muted = false;
    // A refusal is not an error: the controls remain.
    video.play().catch(() => {});
    setStarted(true);
    video.focus({ preventScroll: true });
  };

  return (
    <>
      <video
        ref={ref}
        className={`${styles.fill} ${styles.clickVideo}${layer ? ` ${layer.className}` : ""}`}
        style={layer?.style}
        data-started={started ? "" : undefined}
        preload="none"
        playsInline
        controls={started}
        aria-hidden={started ? undefined : true}
      />
      {!started && (
        <button type="button" className={styles.play} aria-label={label} onClick={start}>
          <span className={styles.playMark} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
