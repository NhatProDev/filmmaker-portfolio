import Link from "next/link";
import { SiteNav } from "./SiteNav";
import styles from "./SiteHeader.module.css";

// Shared site header. Reproduces the About / Art Works prototype header,
// including its density steps. Site-wide mobile navigation is unresolved
// (design-system.md §16 item 14) and is not designed here.
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.wordmark}>
        Nguyen Khanh Nhat
      </Link>
      <SiteNav />
    </header>
  );
}
