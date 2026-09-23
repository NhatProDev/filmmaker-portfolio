import type { Metadata } from "next";
import styles from "../../studio.module.css";

export const metadata: Metadata = { title: "Home page" };

export default function HomeEditorPage() {
  return (
    <>
      <div className={styles.pageHead}>
        <h1>Home page</h1>
      </div>
      <p className={styles.notice}>Home page editing is not available yet.</p>
    </>
  );
}
