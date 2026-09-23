import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import styles from "./layout.module.css";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <SiteHeader />
        {children}
      </div>
    </div>
  );
}
