"use client";

import { useEffect, useRef } from "react";
import type { ContactRow } from "@/content/contact";
import styles from "./contact.module.css";

type ContactRowsProps = {
  rows: ContactRow[];
};

// CONTACT-SPECIFIC (contact-4b-v2-responsive.md §6). The rows stay label-left /
// value-right while every row holds its value on one line beside its label. As
// soon as any row cannot, all four stack together (label above value), so the
// sheet keeps one rhythm rather than a mix. Whether a value fits depends on the
// real copy, not on a width tier, so this is measured as the prototype does.
export function ContactRows({ rows }: ContactRowsProps) {
  const listRef = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let lastWidth = -1;

    const decide = () => {
      // Measure the side-by-side layout, then commit the result.
      delete list.dataset.rows;
      const fits = Array.from(list.children).every((row) => {
        const [label, value] = Array.from(row.children);
        const dt = label.getBoundingClientRect();
        const dd = value.getBoundingClientRect();
        // The prototype's test at 16px: tops within 12px, value under 30px tall
        // (one line at line-height normal; two lines are about 42px).
        const em = parseFloat(getComputedStyle(value).fontSize);
        return Math.abs(dt.top - dd.top) < 0.75 * em && dd.height < 1.875 * em;
      });
      if (!fits) list.dataset.rows = "stack";
    };

    // Only a width change can change the verdict; stacking itself changes the
    // list's height, which must not trigger another pass.
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width === lastWidth) return;
      lastWidth = width;
      decide();
    });
    observer.observe(list);
    document.fonts?.ready.then(decide);

    return () => observer.disconnect();
  }, []);

  return (
    <dl ref={listRef} className={styles.rows}>
      {rows.map(({ label, value, href }) => (
        <div key={label} className={styles.row}>
          <dt className={styles.rowLabel}>{label}</dt>
          <dd className={styles.rowValue}>
            {href ? (
              <a className={styles.rowLink} href={href}>
                {value}
              </a>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
