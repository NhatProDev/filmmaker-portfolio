import Link from "next/link";
import styles from "./not-found.module.css";

// The 404 page's content. It has no design of its own: each part is an
// existing one (see not-found.module.css). The copy is provisional.
export function NotFoundContent() {
  return (
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
  );
}
