"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AlbumDetailDto } from "@/features/albums/album.service";
import { api } from "../../../_components/api";
import { ChooseMediaButton, ErrorLine } from "../../../_components/composition";
import { PublishingPanel } from "../../../_components/PublishingPanel";
import { Thumb, mediaLabel, thumbnailUrl } from "../../../_components/Thumb";
import { useAction } from "../../../_components/useAction";
import styles from "../../../studio.module.css";

// One album's working copy (ADR-0019): its details, its cover, the project it
// belongs with, and its stills in order with their captions and contextual
// descriptions. Visitors see it only after Publish (ADR-0012).

type Item = AlbumDetailDto["items"][number];

function Details({ album, projects }: { album: AlbumDetailDto; projects: { id: string; title: string }[] }) {
  const { run, pending, error } = useAction();
  const [form, setForm] = useState({
    title: album.title,
    slug: album.slug,
    description: album.description ?? "",
    collection: album.collection ?? "",
    projectId: album.project?.id ?? "",
    seoDescription: album.seoDescription ?? "",
  });
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const dirty =
    form.title !== album.title ||
    form.slug !== album.slug ||
    form.description !== (album.description ?? "") ||
    form.collection !== (album.collection ?? "") ||
    form.projectId !== (album.project?.id ?? "") ||
    form.seoDescription !== (album.seoDescription ?? "");
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Details</h2>
      </div>
      <form
        className={styles.panelBody}
        onSubmit={(event) => {
          event.preventDefault();
          void run(() =>
            api("PATCH", `/albums/${album.id}`, {
              title: form.title,
              slug: form.slug,
              description: form.description.trim() || null,
              collection: form.collection.trim() || null,
              projectId: form.projectId || null,
              seoDescription: form.seoDescription.trim() || null,
            }),
          );
        }}
      >
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Title</span>
            <input className={styles.input} required maxLength={200} value={form.title} onChange={(e) => set("title")(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>URL slug — /albums/{form.slug}</span>
            <input className={styles.input} required maxLength={200} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e) => set("slug")(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Collection (optional)</span>
            <input className={styles.input} maxLength={120} value={form.collection} onChange={(e) => set("collection")(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Belongs with project (optional)</span>
            <select className={styles.select} value={form.projectId} onChange={(e) => set("projectId")(e.target.value)}>
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <small className={styles.hint}>The link shows only while that project is published and public.</small>
          </label>
        </div>
        <label className={styles.field} style={{ marginTop: 10 }}>
          <span>Description (optional)</span>
          <textarea className={styles.textarea} maxLength={5000} rows={4} value={form.description} onChange={(e) => set("description")(e.target.value)} />
        </label>
        <label className={styles.field} style={{ marginTop: 10 }}>
          <span>Search description (optional; the description is used otherwise)</span>
          <input className={styles.input} maxLength={500} value={form.seoDescription} onChange={(e) => set("seoDescription")(e.target.value)} />
        </label>
        <div className={styles.actions}>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={pending || !dirty}>
            {dirty ? "Save details" : "Saved"}
          </button>
        </div>
        <ErrorLine error={error} />
      </form>
    </section>
  );
}

function ItemRow({ albumId, item, index, count, onMove }: { albumId: string; item: Item; index: number; count: number; onMove: (index: number, delta: number) => void }) {
  const { run, pending, error } = useAction();
  const [caption, setCaption] = useState(item.caption ?? "");
  const [mode, setMode] = useState<"inherit" | "decorative" | "custom">(item.altText === null ? "inherit" : item.altText === "" ? "decorative" : "custom");
  const [alt, setAlt] = useState(item.altText ?? "");
  const altValue = mode === "inherit" ? null : mode === "decorative" ? "" : alt;
  const dirty = caption !== (item.caption ?? "") || altValue !== item.altText;
  const label = item.media ? mediaLabel(item.media) : "Missing image";
  return (
    <li className={styles.albumItem}>
      <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
      <Thumb src={thumbnailUrl(item.media)} large label="No image" />
      <div className={styles.slotBody}>
        <strong style={{ overflowWrap: "anywhere" }}>{label}</strong>
        <label className={styles.field}>
          <span>Caption (optional)</span>
          <input className={styles.input} maxLength={500} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <div className={styles.row}>
          <select className={styles.select} aria-label={`Description of image ${index + 1}`} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="inherit">Use the image&apos;s own description</option>
            <option value="decorative">Decorative (no description)</option>
            <option value="custom">Describe it here</option>
          </select>
          {mode === "custom" && <input className={styles.input} aria-label={`Alt text of image ${index + 1}`} maxLength={1000} value={alt} onChange={(e) => setAlt(e.target.value)} />}
        </div>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.button} ${styles.small}`}
            disabled={pending || !dirty || (mode === "custom" && !alt.trim())}
            onClick={() => run(() => api("PATCH", `/albums/${albumId}/media/${item.id}`, { caption: caption.trim() || null, altText: altValue }))}
          >
            Save
          </button>
          <button type="button" className={`${styles.button} ${styles.small} ${styles.icon}`} aria-label={`Move image ${index + 1} up`} disabled={pending || index === 0} onClick={() => onMove(index, -1)}>
            ↑
          </button>
          <button type="button" className={`${styles.button} ${styles.small} ${styles.icon}`} aria-label={`Move image ${index + 1} down`} disabled={pending || index === count - 1} onClick={() => onMove(index, 1)}>
            ↓
          </button>
          <button type="button" className={`${styles.button} ${styles.small} ${styles.danger}`} disabled={pending} onClick={() => run(() => api("DELETE", `/albums/${albumId}/media/${item.id}`))}>
            Remove
          </button>
        </div>
        <ErrorLine error={error} />
      </div>
    </li>
  );
}

export function AlbumEditor({ album, projects }: { album: AlbumDetailDto; projects: { id: string; title: string }[] }) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const move = (index: number, delta: number) => {
    const ids = album.items.map((item) => item.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    return run(() => api("PUT", `/albums/${album.id}/media/order`, { albumMediaIds: ids }));
  };
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>{album.title}</h1>
          <p className={styles.hint}>/albums/{album.slug}</p>
        </div>
      </div>
      <div className={styles.editorColumns}>
        <div className={styles.stack}>
          <Details key={album.updatedAt} album={album} projects={projects} />
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Stills</h2>
              <ChooseMediaButton label="Add a still" title="Add a still to the album" types={["IMAGE"]} primary onSelect={(media) => api("POST", `/albums/${album.id}/media`, { mediaId: media.id })} />
            </div>
            <div className={styles.panelBody}>
              <p className={styles.hint}>Shown in justified rows at their own proportions, in this order. Captions follow the rows, numbered.</p>
              {album.items.length ? (
                <ol className={styles.albumItems}>
                  {album.items.map((item, index) => (
                    <ItemRow key={item.id + (item.caption ?? "") + (item.altText ?? "∅")} albumId={album.id} item={item} index={index} count={album.items.length} onMove={move} />
                  ))}
                </ol>
              ) : (
                <p className={styles.notice}>No stills yet. An album needs at least one before it can be published.</p>
              )}
              <ErrorLine error={error} />
            </div>
          </section>
        </div>
        <div className={styles.stack}>
          <PublishingPanel publication={album.publication} basePath={`/albums/${album.id}`} previewHref={`/api/v1/albums/${album.id}/preview`} canUnpublish live={`/albums/${album.slug}`} />
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Cover</h2>
            </div>
            <div className={styles.panelBody}>
              <p className={styles.hint}>Shown on the albums page. Without one, the first still is used.</p>
              <div className={styles.row}>
                <Thumb src={thumbnailUrl(album.cover ?? album.items[0]?.media ?? null)} large label="No image" />
                <ChooseMediaButton label={album.cover ? "Change" : "Choose"} title="Choose the cover" types={["IMAGE"]} onSelect={(media) => api("PATCH", `/albums/${album.id}`, { coverMediaId: media.id })} />
                {album.cover && (
                  <button type="button" className={`${styles.button} ${styles.small}`} disabled={pending} onClick={() => run(() => api("PATCH", `/albums/${album.id}`, { coverMediaId: null }))}>
                    Use the first still
                  </button>
                )}
              </div>
            </div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <button
                type="button"
                className={`${styles.button} ${styles.danger}`}
                disabled={pending}
                onClick={() => {
                  if (confirm("Delete this album? It leaves the site at once. Its stills stay in the Media Library.")) {
                    void run(
                      async () => {
                        await api("DELETE", `/albums/${album.id}`);
                        router.push("/admin/albums");
                      },
                      { refresh: false },
                    );
                  }
                }}
              >
                Delete album
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
