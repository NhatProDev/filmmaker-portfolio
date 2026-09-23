"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { AboutImage } from "@/features/site-content/site-content.types";
import styles from "./about.module.css";

type PortraitProps = {
  image: AboutImage;
  caption: string;
};

// ABOUT-SPECIFIC (about-me-3b-v2-responsive.md §7). Below the 700px tier the
// portrait hangs from the right edge. Its caption becomes a margin note in the
// lateral void when that void holds the caption plus 16px; otherwise it falls
// back below the portrait. The prototype decides this from measured geometry,
// so this does too. On desktop and tablet the figure is as wide as the image,
// so the void is zero and the caption stays below, where the CSS puts it anyway.
const MARGIN_NOTE_GAP = 16;

export function Portrait({ image, caption }: PortraitProps) {
  const figureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const figure = figureRef.current;
    const img = figure?.querySelector("img");
    const figcaption = figure?.querySelector("figcaption");
    const context = document.createElement("canvas").getContext("2d");
    if (!figure || !img || !figcaption || !context) return;

    const decide = () => {
      const style = getComputedStyle(figcaption);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const captionWidth = Math.ceil(context.measureText(figcaption.textContent ?? "").width);
      const voidWidth = figure.clientWidth - img.getBoundingClientRect().width;
      figure.dataset.caption = voidWidth - MARGIN_NOTE_GAP >= captionWidth ? "margin" : "below";
    };

    const observer = new ResizeObserver(decide);
    observer.observe(figure);
    decide();
    document.fonts?.ready.then(decide);

    return () => observer.disconnect();
  }, []);

  return (
    <figure ref={figureRef} className={styles.portrait}>
      <Image
        src={image.src}
        width={image.width}
        height={image.height}
        alt={image.alt}
        unoptimized
        preload
      />
      <figcaption className={`${styles.caption} ${styles.portraitCaption}`}>{caption}</figcaption>
    </figure>
  );
}
