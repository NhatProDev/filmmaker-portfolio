"use client";

import { useState } from "react";
import { api, ApiRequestError, describeError } from "../../_components/api";
import { useUnsavedGuard } from "../../_components/useUnsavedGuard";
import styles from "../../studio.module.css";

// Direct browser-to-storage upload (CLAUDE.md §12, ADR-0020). For each file:
// hash and measure it here, ask the API for a short-lived signed PUT, send
// the bytes straight to storage with progress, then complete with what was
// measured. The site's server never carries the file. A PRIVATE original goes
// to the private bucket and never gets a public URL.

type Audience = "PUBLIC" | "PRIVATE";
type UploadAuthorisation = { mediaId: string; uploadUrl: string; uploadMethod: string; headers: Record<string, string> };
type Measured = { width?: number; height?: number; durationMs?: number };

type Item = {
  id: number;
  name: string;
  state: "measuring" | "uploading" | "completing" | "done" | "failed" | "duplicate";
  progress: number;
  message?: string;
  duplicateOf?: string;
};

export const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime";

// Hashing in the browser lets the server spot a duplicate before the upload.
// Very large files are hashed only if the browser can; otherwise the server
// relies on the provider.
async function sha256(file: File): Promise<string | undefined> {
  if (file.size > 500 * 1024 * 1024 || !crypto.subtle) return undefined;
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The frame size and duration, read by the browser (the server decodes
// nothing). A format the browser cannot read yields nothing: an image then
// has no size, and a video stays Processing.
async function measure(file: File): Promise<Measured> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      const image = new Image();
      image.src = url;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("unreadable"));
      setTimeout(() => reject(new Error("timeout")), 15000);
    });
    const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined;
    return video.videoWidth && video.videoHeight ? { width: video.videoWidth, height: video.videoHeight, durationMs } : {};
  } catch {
    return {};
  } finally {
    URL.revokeObjectURL(url);
  }
}

function put(auth: UploadAuthorisation, file: File, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(auth.uploadMethod, auth.uploadUrl);
    for (const [name, value] of Object.entries(auth.headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Storage refused the upload (${request.status}).`));
    request.onerror = () => reject(new Error("The upload could not reach storage. Check the connection and try again."));
    request.send(file);
  });
}

const SPOKEN: Record<Item["state"], string> = {
  measuring: "preparing",
  uploading: "uploading",
  completing: "checking the stored file",
  done: "in the library",
  failed: "failed",
  duplicate: "already in the library",
};

export function UploadPanel({ onDone, onShow }: { onDone: () => void; onShow: (mediaId: string) => void }) {
  const [audience, setAudience] = useState<Audience>("PUBLIC");
  const [items, setItems] = useState<Item[]>([]);
  const busy = items.some((item) => !["done", "failed", "duplicate"].includes(item.state));
  useUnsavedGuard(busy);

  const update = (id: number, patch: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  async function uploadOne(file: File, id: number) {
    try {
      const [checksumSha256, measured] = await Promise.all([sha256(file), measure(file)]);
      const auth = await api<UploadAuthorisation>("POST", "/media/uploads", {
        filename: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        audience,
        ...(checksumSha256 ? { checksumSha256 } : {}),
      });
      update(id, { state: "uploading" });
      await put(auth, file, (fraction) => update(id, { progress: fraction }));
      update(id, { state: "completing", progress: 1 });
      await api("POST", `/media/${auth.mediaId}/complete`, { ...(checksumSha256 ? { checksumSha256 } : {}), ...measured });
      const note =
        file.type.startsWith("video/") && !measured.width
          ? "Uploaded, but this browser could not read its frame size, so it stays Processing. Re-export as MP4 (H.264) to use it."
          : undefined;
      update(id, { state: "done", message: note });
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.code === "MEDIA_DUPLICATE") {
        update(id, { state: "duplicate", message: "Already in the library.", duplicateOf: String(caught.details?.mediaId ?? "") });
      } else {
        update(id, { state: "failed", message: describeError(caught) });
      }
    }
  }

  async function uploadAll(files: File[]) {
    const start = Date.now();
    const queued = files.map((file, i) => ({ file, id: start + i }));
    setItems((current) => [
      ...queued.map(({ file, id }) => ({ id, name: file.name, state: "measuring" as const, progress: 0 })),
      ...current.filter((item) => !["done", "duplicate"].includes(item.state)),
    ]);
    // One at a time: a slow connection keeps each file's progress honest.
    for (const { file, id } of queued) await uploadOne(file, id);
    onDone();
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Upload</h2>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.hint}>
          Files go straight from this browser to storage, never through the site&apos;s server. Identical files are stored once.
        </p>
        <fieldset className={styles.row} style={{ border: 0, padding: 0, margin: "10px 0 0" }}>
          <legend className={styles.hint} style={{ padding: 0, marginBottom: 4 }}>
            Who can see the original
          </legend>
          <label className={styles.row} style={{ gap: 6 }}>
            <input type="radio" name="audience" value="PUBLIC" checked={audience === "PUBLIC"} disabled={busy} onChange={() => setAudience("PUBLIC")} />
            Public — for pages anyone can open
          </label>
          <label className={styles.row} style={{ gap: 6 }}>
            <input type="radio" name="audience" value="PRIVATE" checked={audience === "PRIVATE"} disabled={busy} onChange={() => setAudience("PRIVATE")} />
            Private — only for private projects, never a public link
          </label>
        </fieldset>
        <div className={styles.row} style={{ marginTop: 10 }}>
          <input
            type="file"
            multiple
            aria-label="Choose files to upload"
            accept={ACCEPTED_TYPES}
            disabled={busy}
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              if (files.length) void uploadAll(files);
              event.target.value = "";
            }}
          />
        </div>
        {/* Always present, so the first change is heard; it names each file's
            state, not every percent (3D-8). */}
        <p role="status" className={styles.srOnly}>
          {items
            .map((item) => `${item.name}: ${SPOKEN[item.state]}${item.message ? ` ${item.message}` : ""}`)
            .join(". ")}
        </p>
        {items.length > 0 && (
          <ul className={styles.uploadList}>
            {items.map((item) => (
              <li key={item.id} data-state={item.state}>
                <span className={styles.uploadName}>{item.name}</span>
                {item.state === "uploading" || item.state === "completing" ? (
                  <progress max={1} value={item.progress} aria-label={`Uploading ${item.name}`} />
                ) : null}
                <span className={styles.hint}>
                  {
                    {
                      measuring: "Preparing…",
                      uploading: `${Math.round(item.progress * 100)}%`,
                      completing: "Checking the stored file…",
                      done: "In the library",
                      failed: "Failed",
                      duplicate: "",
                    }[item.state]
                  }
                  {item.message ? ` ${item.message}` : ""}
                </span>
                {item.duplicateOf && (
                  <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => onShow(item.duplicateOf!)}>
                    Show it
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
