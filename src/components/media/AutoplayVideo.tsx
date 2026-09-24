"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./AutoplayVideo.module.css";

// The two autoplay modes of the playback contract (ADR-0008). Both derive the
// same flags: forced muted, inline, looping, no controls. Nothing about
// playback is configurable here.
export type AutoplayMode = "AUTOPLAY_AMBIENT" | "AUTOPLAY_VISIBLE";

// Share of the surface that must be on screen before it plays. This is the
// prototype's value; what counts as sufficiently visible is still open
// (design-system.md §16 item 7).
const VISIBLE_RATIO = 0.2;

type AutoplayVideoProps = {
  src: string;
  mode: AutoplayMode;
  className?: string;
  // Layout of the element itself, such as ADR-0016's active-picture framing.
  style?: CSSProperties;
};

// A muted loop layered over a poster that the parent renders beneath it. The
// poster is the structural fallback (design-system.md §7.4): the video stays
// transparent until it is actually playing, so a refused autoplay, reduced
// motion, a failed load or no script at all leave the poster in place.
//
// Lifecycle, as in Home's responsive prototype: visible - load and play;
// partly visible - pause; off screen - pause and release the source. Under
// prefers-reduced-motion nothing is loaded. Playback is re-driven when the
// source becomes ready rather than only on a visibility change
// (design-system.md §9.3).
export function AutoplayVideo({ src, mode, className, style }: AutoplayVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Derived, never configured. Set as properties as well as attributes so
    // that inline playback survives on iOS (design-system.md §9.3).
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    let wanted = false;

    const play = () => {
      if (!wanted || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      // A refusal is not an error: the poster simply holds.
      video.play().catch(() => {});
    };
    const prepare = () => {
      if (video.getAttribute("src")) return;
      video.preload = "auto";
      video.setAttribute("src", src);
      video.load();
    };
    const release = () => {
      wanted = false;
      video.pause();
      delete video.dataset.playing;
      if (video.getAttribute("src")) {
        video.removeAttribute("src");
        video.load();
      }
    };
    const showFrame = () => {
      video.dataset.playing = "";
    };

    video.addEventListener("loadeddata", play);
    video.addEventListener("canplay", play);
    video.addEventListener("playing", showFrame);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;

    const start = () => {
      observer?.disconnect();
      observer = undefined;
      if (reducedMotion.matches) {
        release();
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          // One target, so the last entry is its current state.
          const entry = entries[entries.length - 1];
          if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
            wanted = true;
            prepare();
            play();
          } else if (entry.isIntersecting) {
            wanted = false;
            video.pause();
          } else {
            release();
          }
        },
        { threshold: [0, VISIBLE_RATIO] },
      );
      observer.observe(video);
    };

    start();
    reducedMotion.addEventListener("change", start);

    return () => {
      reducedMotion.removeEventListener("change", start);
      observer?.disconnect();
      video.removeEventListener("loadeddata", play);
      video.removeEventListener("canplay", play);
      video.removeEventListener("playing", showFrame);
      release();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      className={className ? `${styles.video} ${className}` : styles.video}
      style={style}
      data-play={mode === "AUTOPLAY_AMBIENT" ? "ambient" : "visible"}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  );
}
