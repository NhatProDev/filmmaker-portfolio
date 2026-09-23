import Image from "next/image";
import { Fragment, type CSSProperties } from "react";
import { justifiedRowsCss } from "./justifiedRowsLayout";
import styles from "./JustifiedRows.module.css";

type JustifiedRowsItem = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

type JustifiedRowsProps = {
  // Scopes the generated rules to this gallery instance.
  id: string;
  items: JustifiedRowsItem[];
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
export function JustifiedRows({ id, items }: JustifiedRowsProps) {
  if (!/^[\w-]+$/.test(id)) throw new Error(`JustifiedRows id must be a plain token: ${id}`);

  const aspects = items.map((item) => item.width / item.height);
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
        </Fragment>
      ))}
    </div>
  );
}
