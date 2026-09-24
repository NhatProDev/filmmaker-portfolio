"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AlbumSummaryDto } from "@/features/albums/album.service";
import { api } from "../../_components/api";
import { slugify } from "../../_components/slug";
import { Thumb, thumbnailUrl } from "../../_components/Thumb";
import { useAction } from "../../_components/useAction";
import styles from "../../studio.module.css";

// Albums (ADR-0019): public sequences of stills, grouped into collections.
// The order here is the order on /albums.

export function AlbumStatus({ album }: { album: Pick<AlbumSummaryDto, "status" | "publication"> }) {
  if (album.status === "PUBLISHED" && album.publication.isPublished) {
    return album.publication.hasUnpublishedChanges ? (
      <span className={`${styles.badge} ${styles.badgeInfo}`}>Published · changes</span>
    ) : (
      <span className={`${styles.badge} ${styles.badgeOk}`}>Published</span>
    );
  }
  return <span className={`${styles.badge} ${styles.badgeWarn}`}>Draft</span>;
}

export function AlbumsBoard({ albums }: { albums: AlbumSummaryDto[] }) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [collection, setCollection] = useState("");
  const collections = [...new Set(albums.map((album) => album.collection).filter((name): name is string => Boolean(name)))];

  async function create(event: FormEvent) {
    event.preventDefault();
    await run(
      async () => {
        const album = await api<{ id: string }>("POST", "/albums", { title, slug, collection: collection || null });
        router.push(`/admin/albums/${album.id}`);
      },
      { refresh: false },
    );
  }

  function move(index: number, delta: number) {
    const ids = albums.map((album) => album.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    return run(() => api("PUT", "/albums/order", { albumIds: ids }));
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Albums</h1>
          <p className={styles.hint}>
            Sequences of stills with their own page at /albums. The order here is the order there; albums with the same collection are grouped. Albums are
            not linked from the site&apos;s navigation yet.
          </p>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>New album</h2>
        </div>
        <form className={styles.panelBody} onSubmit={create}>
          <div className={styles.grid3}>
            <label className={styles.field}>
              <span>Title</span>
              <input
                className={styles.input}
                required
                maxLength={200}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (!slugEdited) setSlug(slugify(event.target.value));
                }}
              />
            </label>
            <label className={styles.field}>
              <span>URL slug — /albums/{slug || "…"}</span>
              <input
                className={styles.input}
                required
                maxLength={200}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              <span>Collection (optional)</span>
              <input className={styles.input} list="album-collections" maxLength={120} value={collection} onChange={(event) => setCollection(event.target.value)} />
              <datalist id="album-collections">
                {collections.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={pending || !title || !slug}>
              Create draft
            </button>
          </div>
        </form>
      </section>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <section className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 84 }}>Order</th>
              <th style={{ width: 80 }}>Cover</th>
              <th>Title</th>
              <th>Status</th>
              <th>Collection</th>
              <th>Images</th>
            </tr>
          </thead>
          <tbody>
            {albums.map((album, index) => (
              <tr key={album.id}>
                <td>
                  <div className={styles.row} style={{ gap: 4 }}>
                    <button type="button" className={`${styles.button} ${styles.small} ${styles.icon}`} aria-label={`Move ${album.title} up`} disabled={pending || index === 0} onClick={() => move(index, -1)}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.small} ${styles.icon}`}
                      aria-label={`Move ${album.title} down`}
                      disabled={pending || index === albums.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td>
                  <Thumb src={thumbnailUrl(album.cover)} label="No image" />
                </td>
                <td>
                  <Link href={`/admin/albums/${album.id}`}>
                    <strong>{album.title}</strong>
                  </Link>
                  <div className={styles.mono}>/albums/{album.slug}</div>
                </td>
                <td>
                  <AlbumStatus album={album} />
                </td>
                <td>{album.collection ?? <span className={styles.hint}>—</span>}</td>
                <td>{album.itemCount}</td>
              </tr>
            ))}
            {albums.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.hint}>
                  No albums yet. Create one above, then add stills from the Media Library.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
