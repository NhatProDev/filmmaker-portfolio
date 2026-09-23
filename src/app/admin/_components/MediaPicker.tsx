"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { MediaDto } from "@/features/media/media.mapper";
import { api, describeError } from "./api";
import { mediaLabel, thumbnailUrl } from "./Thumb";
import styles from "../studio.module.css";

type MediaType = MediaDto["type"];

// A modal chooser over the Media Library, filtered to the types a slot
// accepts. It lists ready assets only: only those can be placed.
export function MediaPicker({
  title,
  types,
  onSelect,
  onClose,
}: {
  title: string;
  types: MediaType[];
  onSelect: (media: MediaDto) => void | Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const typeKey = types.join(",");
  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ status: "READY", pageSize: "100", ...(search ? { search } : {}) });
    Promise.all(typeKey.split(",").map((type) => api<MediaDto[]>("GET", `/media?${query}&type=${type}`)))
      .then((lists) => !cancelled && setItems(lists.flat()))
      .catch((caught) => !cancelled && setError(describeError(caught)));
    return () => {
      cancelled = true;
    };
  }, [typeKey, search]);

  return (
    <dialog ref={dialog} className={styles.dialog} onClose={onClose} aria-label={title}>
      <div className={styles.panelHead}>
        <h2>{title}</h2>
        <div className={styles.row}>
          <input
            className={styles.input}
            type="search"
            placeholder="Search by file name or alt text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 260 }}
          />
          <button type="button" className={styles.button} onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
      </div>
      <div className={styles.dialogBody}>
        {error && <p className={styles.error}>{error}</p>}
        {!items && !error && <p className={styles.hint}>Loading…</p>}
        {items && items.length === 0 && <p className={styles.hint}>No ready {types.join(" or ").toLowerCase()} in the library.</p>}
        {items && items.length > 0 && (
          <div className={styles.tiles}>
            {items.map((media) => {
              const src = thumbnailUrl(media);
              return (
                <button
                  key={media.id}
                  type="button"
                  className={styles.tile}
                  onClick={async () => {
                    await onSelect(media);
                    dialog.current?.close();
                  }}
                >
                  {src ? (
                    <Image className={styles.tileImage} src={src} alt="" width={320} height={200} unoptimized />
                  ) : (
                    <span className={`${styles.tileImage} ${styles.thumbEmpty}`}>{media.type}</span>
                  )}
                  <span className={styles.tileName}>{mediaLabel(media)}</span>
                  <span className={styles.hint}>
                    {media.type}
                    {media.width && media.height ? ` · ${media.width}×${media.height}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </dialog>
  );
}
