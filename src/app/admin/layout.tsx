import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "./studio.module.css";

// The Studio: the administrator's CMS. It sits outside the public route groups
// and shares nothing with the public identity. Never indexed (CLAUDE.md §16).
export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function StudioRootLayout({ children }: { children: ReactNode }) {
  return <div className={styles.studio}>{children}</div>;
}
