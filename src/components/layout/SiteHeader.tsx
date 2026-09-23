import Link from "next/link";
import { SiteNav } from "./SiteNav";
import styles from "./SiteHeader.module.css";

// Shared site header. Reproduces the About / Art Works prototype header,
// including its density steps. Home uses it too, rather than the smaller type
// of Home's own prototype header: one header for the whole site is a
// site-system decision. Site-wide mobile navigation is unresolved
// (design-system.md §16 item 14) and is not designed here; until it is, the
// wordmark wrapping to two lines on narrow phones is accepted as intended.
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
