import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "./(public)/layout";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Not found",
};

// Every unmatched URL, and every notFound(). It renders inside the public
// frame, so the shared header and the shell's tiers apply. It has no design of
// its own: each part is an existing one (see not-found.module.css). The copy is
// provisional.
export default function NotFound() {
  return (
    <PublicLayout>
      <main className={styles.page}>
        <div className={styles.datum} />
        <p className={styles.marker}>404</p>
        <div className={styles.headingBox}>
          <h1 className={styles.heading}>Not found</h1>
        </div>
        <p className={styles.line}>
          There is nothing at this address. The link may be out of date, or the page has moved.
        </p>
        <p className={styles.more}>
          <Link href="/works">All works</Link>
        </p>
      </main>
    </PublicLayout>
  );
}
