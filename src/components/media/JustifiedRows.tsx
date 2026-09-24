import Image from "next/image";
import { Fragment, type CSSProperties } from "react";
import { justifiedRowsCss } from "./justifiedRowsLayout";
import styles from "./JustifiedRows.module.css";

type JustifiedRowsItem = {
  src: string;
  width: number;
  height: number;
  alt: string;
  // ADR-0016: the aspect of the picture inside a letterboxed file.
  activeAspect?: number;
};

type JustifiedRowsProps = {
  // Scopes the generated rules to this gallery instance.
  id: string;
  items: JustifiedRowsItem[];
  // "active": a letterboxed still is packed and framed at its active
  // picture's aspect, its bars cropped away (ADR-0016). "encoded" draws every
  // file as it is encoded, as Home's locked sections do until their design
  // review. Stills without an active picture render the same either way.
  framing?: "active" | "encoded";
};

// Small stable hash, so a changed gallery never reuses a stale stylesheet.
function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

// GALLERY JUSTIFIED_ROWS: native aspect, source order, full measure. The
// packing is evaluated on the server and delivered as container queries (see
// justifiedRowsLayout.ts), so every width renders correctly from the first
// paint.
// Breaks sit between items; the generated rules show only the ones that are
// row boundaries at the current measure. Without container-query support the
// base styles hold: one item per row, full width, native aspect.
export function JustifiedRows({ id, items, framing = "encoded" }: JustifiedRowsProps) {
  if (!/^[\w-]+$/.test(id)) throw new Error(`JustifiedRows id must be a plain token: ${id}`);

  const active = (item: JustifiedRowsItem) => (framing === "active" ? item.activeAspect : undefined);
  const aspects = items.map((item) => active(item) ?? item.width / item.height);
  const css = justifiedRowsCss(`[data-justified-rows="${id}"]`, aspects);

  return (
    <div className={styles.rows} data-justified-rows={id}>
      {css && (
        <style href={`justified-rows-${id}-${hash(css)}`} precedence="default">
          {css}
        </style>
      )}
      {items.map((item, index) => (
        <Fragment key={item.src}>
          {index > 0 && <span className={styles.break} data-break={index} aria-hidden="true" />}
          {active(item) ? (
            // The cell has the picture's aspect; the file, at its own
            // proportions, is centred so its bars fall outside the cell.
            <div
              className={`${styles.cell} ${styles.activeCell}`}
              data-item={index}
              style={{ "--aspect": aspects[index], "--file": item.width / item.height } as CSSProperties}
            >
              <Image className={styles.activeImage} src={item.src} alt={item.alt} width={item.width} height={item.height} unoptimized />
            </div>
          ) : (
            <div
              className={styles.cell}
              data-item={index}
              style={{ "--aspect": aspects[index] } as CSSProperties}
            >
              <Image
                className={styles.image}
                src={item.src}
                alt={item.alt}
                fill
                unoptimized
              />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
