"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import type { ProjectImage } from "@/content/projects";
import { bootTitle, placeTitle } from "./titlePlacement";
import styles from "./project.module.css";

type ProjectOpeningProps = {
  title: string;
  // The idle frame: the film's poster, or the image of an IMAGE HERO.
  image: ProjectImage;
  // A CLICK_TO_PLAY film. Without one the HERO is an IMAGE HERO: no activation,
  // and the title overlay stays (ADR-0010 §4).
  film?: string;
};

// Block 1, the HERO, and the title that belongs to it. Its chrome — overlay,
// scrims, affordance, Back to works — is derived in one place, the stylesheet,
// from two states on the opening: the title placement (titlePlacement.ts) and
// media activation. A re-render cannot resurrect a dismissed overlay.
//
// Source order at every width: Back to works, the play affordance, the title.
// Below 700px the title and Back to works move into flow beneath the film; the
// second Back to works is that line's place in flow (ADR-0010 §6).
export function ProjectOpening({ title, image, film }: ProjectOpeningProps) {
  const openingRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  // Before paint on a client render. After a server render the bootstrap has
  // already placed the title, so this confirms it and keeps it placed as the
  // frame and the fonts change.
  useLayoutEffect(() => {
    const opening = openingRef.current;
    const hero = heroRef.current;
    if (!opening || !hero) return;
    bootTitle(opening, placeTitle);
    const place = () => placeTitle(opening);
    // The frame, not the opening: the placement changes the opening's height.
    const observer = new ResizeObserver(place);
    observer.observe(hero);
    document.fonts?.addEventListener("loadingdone", place);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", place);
    };
  }, []);

  // The affordance leaves on activation; focus moves to the film's controls.
  useEffect(() => {
    if (started) videoRef.current?.focus({ preventScroll: true });
  }, [started]);

  // CLICK_TO_PLAY. The whole frame is the hit area, and the affordance is its
  // keyboard route. Dismissal follows the act, not a playback event (ADR-0010
  // §4); audio is available only after it, and only here (ADR-0008).
  const activate = (event: MouseEvent<HTMLElement>) => {
    const video = videoRef.current;
    if (!film || !video || started || (event.target as Element).closest("a")) return;
    document.querySelectorAll<HTMLVideoElement>('video[data-play="visible"]').forEach((loop) => loop.pause());
    if (!video.getAttribute("src")) {
      video.setAttribute("src", film);
      video.preload = "auto";
      video.load();
    }
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.controls = true;
    video.muted = false;
    // A refusal is not an error: the controls remain.
    video.play().catch(() => {});
    setStarted(true);
  };

  return (
    <div
      ref={openingRef}
      className={styles.opening}
      data-opening=""
      data-started={started ? "" : undefined}
      // The bootstrap may mark the title placement before hydration.
      suppressHydrationWarning
    >
      <section
        ref={heroRef}
        className={styles.hero}
        data-hero=""
        data-film={film ? "" : undefined}
        onClick={film ? activate : undefined}
      >
        <Image className={styles.fill} src={image.src} alt={image.alt} fill unoptimized preload />
        {film && (
          <video
            ref={videoRef}
            className={`${styles.fill} ${styles.film}`}
            preload="none"
            playsInline
            controls={started}
            aria-hidden={started ? undefined : true}
          />
        )}
        <div className={styles.scrimTop} aria-hidden="true" />
        <Link href="/works" className={`${styles.line} ${styles.back}`} data-back="">
          Back to works
        </Link>
        {film && (
          <button type="button" className={styles.affordance} data-affordance="" aria-label="Play film">
            <span className={styles.playMark} aria-hidden="true" />
          </button>
        )}
      </section>

      <div className={styles.flow}>
        <div className={styles.backRow}>
          <Link href="/works" className={styles.line}>
            Back to works
          </Link>
        </div>
        <div className={styles.titleBox}>
          <h1 className={styles.title} data-title="">
            {title}
          </h1>
        </div>
      </div>
    </div>
  );
}
