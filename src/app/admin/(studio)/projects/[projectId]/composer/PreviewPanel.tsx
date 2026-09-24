"use client";

import { useEffect, useRef, useState } from "react";
import studio from "../../../../studio.module.css";
import styles from "./composer.module.css";

// The working copy on the real public page (ADR-0012 preview), framed at a
// desktop, tablet or phone width and scaled to fit. It is the site's own
// renderer, not an imitation: what shows here is what Publish would put live,
// including the derived tablet and phone layouts. It reloads after every
// change.

const DEVICES = {
  desktop: { label: "Desktop", width: 1440, height: 900 },
  tablet: { label: "Tablet", width: 820, height: 1180 },
  mobile: { label: "Phone", width: 390, height: 844 },
} as const;

type Device = keyof typeof DEVICES;

export function PreviewPanel({ href, version }: { href: string; version: string }) {
  const [device, setDevice] = useState<Device | null>(null);
  const [reloads, setReloads] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [device]);

  const size = device ? DEVICES[device] : null;
  const scale = size && available ? Math.min(1, available / size.width) : 1;

  return (
    <section className={styles.preview} aria-label="Responsive preview">
      <div className={styles.previewBar}>
        <strong>Preview</strong>
        <div className={styles.segmented} role="group" aria-label="Preview width">
          {(Object.keys(DEVICES) as Device[]).map((key) => (
            <button key={key} type="button" aria-pressed={device === key} onClick={() => setDevice(device === key ? null : key)}>
              {DEVICES[key].label}
            </button>
          ))}
        </div>
        {device && (
          <button type="button" className={`${studio.button} ${studio.small}`} onClick={() => setReloads(reloads + 1)}>
            Reload
          </button>
        )}
        <a className={`${studio.button} ${studio.small}`} href={href} target="_blank" rel="noreferrer">
          Open ↗
        </a>
      </div>
      {size ? (
        <div ref={frame} className={styles.previewFrame} style={{ height: Math.round(size.height * scale) }}>
          <iframe
            key={`${version}-${device}-${reloads}`}
            title={`Preview at ${size.label.toLowerCase()} width, ${size.width} pixels`}
            src={href}
            width={size.width}
            height={size.height}
            style={{ transform: `scale(${scale})` }}
          />
        </div>
      ) : (
        <p className={studio.hint}>
          Choose a width to see the working copy as visitors would: the same page, the same derived tablet and phone layouts. Nothing is published.
        </p>
      )}
      {size && (
        <p className={studio.hint}>
          {size.label} · {size.width}px{scale < 1 ? `, shown at ${Math.round(scale * 100)}%` : ""}. Hidden blocks are not shown; blocks that still need media stop the preview with the reason.
        </p>
      )}
    </section>
  );
}
