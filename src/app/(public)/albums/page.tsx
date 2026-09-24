import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import styles from "./albums.module.css";

export const metadata: Metadata = {
  title: "Albums",
  alternates: { canonical: "/albums" },
};

// The published albums (ADR-0019), in display order, grouped by collection in
// order of first appearance. Static; publishing revalidates. With nothing
// published the address does not exist.
export default async function AlbumsPage() {
  const { collections } = await getContentGateway().getAlbumsIndex();
  const total = collections.reduce((n, group) => n + group.albums.length, 0);
  if (!total) notFound();

  return (
    <main className={styles.albums}>
      <div className={styles.mast}>
        <div className={styles.mastBox}>
          <h1 className={styles.heading}>Albums</h1>
        </div>
        <p className={styles.count}>
          {total} {total === 1 ? "album" : "albums"}
        </p>
      </div>
      {collections.map((group, i) => (
        <section key={group.name ?? `ungrouped-${i}`} className={styles.collection} aria-label={group.name ?? "Albums"}>
          {group.name && <h2 className={styles.label}>{group.name}</h2>}
          <ul className={styles.cards}>
            {group.albums.map((album, j) => (
              <li key={album.slug}>
                <Link href={`/albums/${album.slug}`} className={styles.card}>
                  <span className={styles.cardFrame}>
                    <Image className={styles.cardImage} src={album.cover.src} alt="" fill unoptimized preload={i === 0 && j === 0} />
                  </span>
                  <span className={styles.cardTitle}>
                    <span>{album.title}</span>
                    <span className={styles.cardCount}>{album.count}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
