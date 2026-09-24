"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { MediaDto } from "@/features/media/media.mapper";
import type { MediaUsage } from "@/features/media/media.repository";
import { api, describeError } from "../../_components/api";
import { ChooseMediaButton, ErrorLine } from "../../_components/composition";
import { mediaLabel, Thumb, thumbnailUrl } from "../../_components/Thumb";
import { useAction } from "../../_components/useAction";
import styles from "../../studio.module.css";
import { UploadPanel } from "./UploadPanel";

const USAGE_LABEL: Record<MediaUsage["kind"], string> = {
  PROJECT_COVER: "Cover of",
  PROJECT_PREVIEW: "Moving preview of",
  BLOCK_MEDIA: "Placed in",
  PLACEMENT_POSTER: "Poster for a placement in",
  ASSET_POSTER: "Default poster of a video",
  PAGE_MEDIA: "Image on",
  ALBUM_ITEM: "In the album",
  ALBUM_COVER: "Cover of the album",
  PUBLISHED_ALBUM: "Live on the site in the album",
  PUBLISHED_PROJECT: "Live on the site in",
  PUBLISHED_PAGE: "Live on the site on",
};

const PAGE_NAMES: Record<string, string> = { HOME: "Home", ABOUT: "About", CONTACT: "Contact", SITE: "site settings" };

function usageText(usage: MediaUsage) {
  if ("albumTitle" in usage) return `${USAGE_LABEL[usage.kind]} ${usage.albumTitle}`;
  if (usage.kind === "PAGE_MEDIA") return `${USAGE_LABEL.PAGE_MEDIA} the ${PAGE_NAMES[usage.pageKey] ?? usage.pageKey} page (${usage.slot})`;
  if ("projectTitle" in usage && usage.projectTitle) return `${USAGE_LABEL[usage.kind]} ${usage.projectTitle}`;
  if ("pageKey" in usage && usage.pageKey) return `${USAGE_LABEL[usage.kind]} the ${usage.pageKey.toLowerCase()} page`;
  return USAGE_LABEL[usage.kind];
}

const sizeText = (bytes: number | null) =>
  bytes === null ? "—" : bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;

function ExternalPanel({ onDone }: { onDone: () => void }) {
  const { run, pending, error } = useAction();
  const [provider, setProvider] = useState<"vimeo" | "youtube">("vimeo");
  const [url, setUrl] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(
      async () => {
        await api("POST", "/media/external", { provider, url });
        setUrl("");
        onDone();
      },
      { refresh: false },
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>External video</h2>
      </div>
      <form className={styles.panelBody} onSubmit={submit}>
        <p className={styles.hint}>Vimeo or YouTube. External video only plays on request, never automatically.</p>
        <div className={styles.row} style={{ marginTop: 10 }}>
          <select
            className={styles.select}
            style={{ width: 120 }}
            aria-label="Provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as "vimeo" | "youtube")}
          >
            <option value="vimeo">Vimeo</option>
            <option value="youtube">YouTube</option>
          </select>
          <input
            className={styles.input}
            style={{ flex: 1 }}
            type="url"
            required
            aria-label="Video address"
            placeholder="https://vimeo.com/…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit" className={styles.button} disabled={pending || !url}>
            Add
          </button>
        </div>
        <ErrorLine error={error} />
      </form>
    </section>
  );
}

function Details({ media, onChanged, onDeleted }: { media: MediaDto; onChanged: () => void; onDeleted: () => void }) {
  const { run, pending, error } = useAction();
  const [alt, setAlt] = useState(media.altText ?? "");
  const [usages, setUsages] = useState<MediaUsage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<MediaUsage[]>("GET", `/media/${media.id}/usages`)
      .then((list) => !cancelled && setUsages(list))
      .catch(() => !cancelled && setUsages([]));
    return () => {
      cancelled = true;
    };
  }, [media.id, media.updatedAt]);

  const patch = (body: object) =>
    run(
      async () => {
        await api("PATCH", `/media/${media.id}`, body);
        onChanged();
      },
      { refresh: false },
    );
  const src = thumbnailUrl(media);

  return (
    <section className={styles.panel} style={{ position: "sticky", top: 68 }}>
      <div className={styles.panelHead}>
        <h2 style={{ overflowWrap: "anywhere" }}>{mediaLabel(media)}</h2>
      </div>
      <div className={styles.panelBody} style={{ display: "grid", gap: 12 }}>
        {src ? (
          <div style={{ position: "relative" }}>
            <Image
              src={src}
              alt=""
              width={media.width ?? 320}
              height={media.height ?? 200}
              unoptimized
              style={{ width: "100%", height: "auto", borderRadius: 4, display: "block" }}
            />
            {media.type === "IMAGE" && <LetterboxBands media={media} />}
          </div>
        ) : (
          <Thumb src={null} large label={media.type} />
        )}
        <dl className={styles.hint} style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 12px" }}>
          <dt>Type</dt>
          <dd style={{ margin: 0 }}>
            {media.type} · {media.status}
          </dd>
          <dt>Audience</dt>
          <dd style={{ margin: 0 }}>
            {media.type === "EXTERNAL_VIDEO"
              ? "Hosted by the provider"
              : media.isPrivate
                ? "Private — never a public link; private projects deliver it through signed, short-lived links"
                : "Public"}
          </dd>
          <dt>Size</dt>
          <dd style={{ margin: 0 }}>
            {media.width && media.height ? `${media.width}×${media.height} · ` : ""}
            {sizeText(media.fileSizeBytes)}
            {media.durationMs ? ` · ${(media.durationMs / 1000).toFixed(1)} s` : ""}
          </dd>
          <dt>Key</dt>
          <dd className={styles.mono} style={{ margin: 0 }}>
            {media.storageKey ?? media.externalUrl}
          </dd>
          {media.checksumSha256 && (
            <>
              <dt>SHA-256</dt>
              <dd className={styles.mono} style={{ margin: 0 }}>
                {media.checksumSha256.slice(0, 16)}…
              </dd>
            </>
          )}
        </dl>

        <label className={styles.field}>
          <span>Default alt text</span>
          <textarea
            className={styles.textarea}
            style={{ minHeight: 60 }}
            value={alt}
            maxLength={1000}
            onChange={(event) => setAlt(event.target.value)}
          />
        </label>
        <p className={styles.hint}>Used wherever a placement does not describe it for its own context.</p>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.button} ${styles.small}`}
            disabled={pending || alt === (media.altText ?? "")}
            onClick={() => patch({ altText: alt.trim() || null })}
          >
            Save alt text
          </button>
        </div>

        <ActivePictureControl media={media} disabled={pending} onChange={(activePicture) => patch({ activePicture })} />

        {media.type !== "IMAGE" && (
          <div className={styles.field}>
            <span>Default poster</span>
            <div className={styles.row}>
              <Thumb src={thumbnailUrl(media.poster)} label="None" />
              <ChooseMediaButton
                label={media.poster ? "Change" : "Choose"}
                title="Choose the default poster"
                types={["IMAGE"]}
                onSelect={async (image) => {
                  await api("PATCH", `/media/${media.id}`, { posterMediaId: image.id });
                  onChanged();
                }}
              />
              {media.poster && (
                <button
                  type="button"
                  className={`${styles.button} ${styles.small}`}
                  disabled={pending}
                  onClick={() => patch({ posterMediaId: null })}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        <div className={styles.field}>
          <span>Used by</span>
          {usages === null && <p className={styles.hint}>Checking…</p>}
          {usages?.length === 0 && <p className={styles.hint}>Nothing. It can be deleted.</p>}
          {usages && usages.length > 0 && (
            <ul className={styles.hint} style={{ margin: 0, paddingLeft: 18 }}>
              {usages.map((usage, i) => (
                <li key={i}>{usageText(usage)}</li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.button} ${styles.small} ${styles.danger}`}
            disabled={pending || !usages || usages.length > 0}
            onClick={() => {
              if (confirm("Delete this media from the library?")) {
                void run(
                  async () => {
                    await api("DELETE", `/media/${media.id}`);
                    onDeleted();
                  },
                  { refresh: false },
                );
              }
            }}
          >
            Delete
          </button>
          {usages && usages.length > 0 && <span className={styles.hint}>In use, so it cannot be deleted.</span>}
        </div>
        <ErrorLine error={error} />
      </div>
    </section>
  );
}

export function MediaLibrary({ initial, total: initialTotal }: { initial: MediaDto[]; total: number }) {
  const [items, setItems] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [type, setType] = useState("");
  const [audience, setAudience] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(initial[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        pageSize: "100",
        ...(type ? { type } : {}),
        ...(audience ? { audience } : {}),
        ...(search ? { search } : {}),
      });
      const response = await fetch(`/api/v1/media?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "The library could not be loaded.");
      setItems(payload.data);
      setTotal(payload.meta.total);
      setError(null);
    } catch (caught) {
      setError(describeError(caught));
    }
  }, [type, audience, search]);

  // A duplicate found during upload: show the asset already in the library,
  // even when the current filters hide it.
  const show = useCallback(async (mediaId: string) => {
    try {
      const asset = await api<MediaDto>("GET", `/media/${mediaId}`);
      setItems((current) => (current.some((item) => item.id === asset.id) ? current : [asset, ...current]));
      setSelected(asset.id);
    } catch (caught) {
      setError(describeError(caught));
    }
  }, []);

  // Filters apply shortly after typing stops; the first render already has
  // the server's data.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(() => void reload(), 200);
    return () => clearTimeout(timer);
  }, [reload]);

  const current = items.find((item) => item.id === selected) ?? null;

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Media</h1>
          <p className={styles.hint}>{total} asset(s). Identical files are stored once.</p>
        </div>
        <div className={styles.row}>
          <select
            className={styles.select}
            style={{ width: 150 }}
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Type"
          >
            <option value="">All types</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
            <option value="EXTERNAL_VIDEO">External video</option>
          </select>
          <select
            className={styles.select}
            style={{ width: 150 }}
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            aria-label="Audience"
          >
            <option value="">Public and private</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
          <input
            className={styles.input}
            style={{ width: 240 }}
            type="search"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search media"
          />
        </div>
      </div>
      <div className={styles.grid2}>
        <UploadPanel onDone={() => void reload()} onShow={(id) => void show(id)} />
        <ExternalPanel onDone={() => void reload()} />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.split}>
        <div className={styles.tiles}>
          {items.map((media) => {
            const src = thumbnailUrl(media);
            return (
              <button
                key={media.id}
                type="button"
                className={`${styles.tile} ${media.id === selected ? styles.tileSelected : ""}`}
                aria-pressed={media.id === selected}
                onClick={() => setSelected(media.id)}
              >
                {src ? (
                  <Image className={styles.tileImage} src={src} alt="" width={320} height={200} unoptimized />
                ) : (
                  <span className={`${styles.tileImage} ${styles.thumbEmpty}`}>{media.type}</span>
                )}
                <span className={styles.tileName}>{mediaLabel(media)}</span>
                <span className={styles.hint}>
                  {media.type === "IMAGE" ? "Image" : media.type === "VIDEO" ? "Video" : "External"}
                  {media.width && media.height ? ` · ${media.width}×${media.height}` : ""}
                  {media.status !== "READY" ? ` · ${media.status.toLowerCase()}` : ""}
                </span>
                {media.isPrivate && <span className={`${styles.badge} ${styles.badgeWarn} ${styles.tileBadge}`}>Private</span>}
              </button>
            );
          })}
          {items.length === 0 && <p className={styles.hint}>Nothing matches.</p>}
        </div>
        {current && (
          <Details
            key={current.id + current.updatedAt}
            media={current}
            onChanged={() => void reload()}
            onDeleted={() => {
              setSelected(null);
              void reload();
            }}
          />
        )}
      </div>
    </>
  );
}

// ---- ADR-0016: baked-in letterbox ----

const PICTURE_CHOICES: [string, string][] = [
  ["FULL", "Full frame — the file as it is"],
  ["2.39", "2.39 : 1 inside the frame"],
  ["2.00", "2.00 : 1 inside the frame"],
  ["1.85", "1.85 : 1 inside the frame"],
];

const fileAspect = (media: MediaDto) => (media.width && media.height ? media.width / media.height : null);

// The black bands the chosen picture leaves above and below, drawn over the
// preview so a wrong choice is visible before anything is published.
function LetterboxBands({ media }: { media: MediaDto }) {
  const file = fileAspect(media);
  const active = Number(media.activePicture);
  if (!file || !(active > file)) return null;
  const band = `${((1 - file / active) / 2) * 100}%`;
  const shade = { position: "absolute", left: 0, right: 0, height: band, background: "rgba(180, 35, 24, 0.35)", borderColor: "#b42318", borderStyle: "dashed", borderWidth: 0 } as const;
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ ...shade, top: 0, borderBottomWidth: 1 }} />
      <div style={{ ...shade, bottom: 0, borderTopWidth: 1 }} />
    </div>
  );
}

function ActivePictureControl({ media, disabled, onChange }: { media: MediaDto; disabled: boolean; onChange: (value: string) => void }) {
  if (media.type === "EXTERNAL_VIDEO" || media.status !== "READY") return null;
  const file = fileAspect(media);
  // Only a picture wider than its file can be a letterbox inside it.
  const choices = PICTURE_CHOICES.filter(([value]) => value === "FULL" || (file !== null && Number(value) > file + 0.01));
  if (choices.length === 1 && media.activePicture === "FULL") return null;
  return (
    <div className={styles.field}>
      <label className={styles.field}>
        <span>Picture area</span>
        <select className={styles.select} value={media.activePicture} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          {choices.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.hint}>
        Best: upload a clean export at the film&apos;s own ratio, without black bars. Choose an area only when bars are baked into a file you cannot
        re-export; project blocks, galleries and albums then frame the picture and leave the bars out. A project&apos;s opening and
        presets, and Home, still show the file as it is encoded. {media.type === "VIDEO" ? "Give its poster the same area if it has the same bars. " : ""}
        Published pages change when you publish them again.
      </p>
      {media.type === "VIDEO" && media.activePicture !== "FULL" && file && (
        <div aria-hidden="true" style={{ position: "relative", width: 160, aspectRatio: String(file), background: "#1c1917", borderRadius: 3 }}>
          <LetterboxBands media={media} />
        </div>
      )}
    </div>
  );
}
