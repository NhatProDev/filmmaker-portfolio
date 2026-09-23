"use client";

import { useState, type ReactNode } from "react";
import type { MediaDto } from "@/features/media/media.mapper";
import type { BlockDto, BlockMediaDto } from "@/features/project-builder/composition.mapper";
import { api } from "./api";
import { MediaPicker } from "./MediaPicker";
import { mediaLabel, Thumb, thumbnailUrl } from "./Thumb";
import { useAction } from "./useAction";
import styles from "../studio.module.css";

// Building blocks of the template-shaped editors (ADR-0013): a page is edited
// as the fixed sequence of slots its locked template renders, so every edit
// produces a composition the public page can show.

type MediaType = MediaDto["type"];

export function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p className={styles.error} role="alert">
      {error}
    </p>
  ) : null;
}

export function Slot({
  number,
  title,
  description,
  block,
  absentAction,
  children,
  removable = true,
}: {
  number: number;
  title: string;
  description: string;
  block: BlockDto | null;
  absentAction?: ReactNode;
  children?: ReactNode;
  removable?: boolean;
}) {
  const { run, pending, error } = useAction();
  const className = [styles.slot, !block && styles.slotAbsent, block?.isHidden && styles.slotHidden]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={className} aria-label={title}>
      <div className={styles.slotHead}>
        <span className={styles.slotNumber}>{String(number).padStart(2, "0")}</span>
        <h3>{title}</h3>
        {block?.isHidden && <span className={styles.badge}>Hidden</span>}
        {block ? (
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.button} ${styles.small}`}
              disabled={pending}
              onClick={() => run(() => api("PATCH", `/blocks/${block.id}`, { isHidden: !block.isHidden }))}
            >
              {block.isHidden ? "Show" : "Hide"}
            </button>
            {removable && (
              <button
                type="button"
                className={`${styles.button} ${styles.small} ${styles.danger}`}
                disabled={pending}
                onClick={() => {
                  if (confirm(`Remove “${title}” from this page? Media stays in the library.`)) {
                    void run(() => api("DELETE", `/blocks/${block.id}`));
                  }
                }}
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          absentAction
        )}
      </div>
      <div className={styles.slotBody}>
        <p className={styles.hint}>{description}</p>
        {block && children}
        <ErrorLine error={error} />
      </div>
    </section>
  );
}

// Opens the media picker and hands the choice to `onSelect`.
export function ChooseMediaButton({
  label,
  title,
  types,
  onSelect,
  disabled,
  primary = false,
}: {
  label: string;
  title: string;
  types: MediaType[];
  onSelect: (media: MediaDto) => Promise<unknown>;
  disabled?: boolean;
  primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { run, pending, error } = useAction();
  return (
    <>
      <button
        type="button"
        className={`${styles.button} ${styles.small} ${primary ? styles.primary : ""}`}
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open && (
        <MediaPicker
          title={title}
          types={types}
          onClose={() => setOpen(false)}
          onSelect={(media) => {
            void run(() => onSelect(media));
          }}
        />
      )}
      <ErrorLine error={error} />
    </>
  );
}

// One media placement: the asset, its contextual alt text (ADR-0011) and,
// for video, its poster with the placement override (ADR-0015).
export function PlacementEditor({
  blockId,
  item,
  replaceTypes,
  onRemove,
  extra,
}: {
  blockId: string;
  item: BlockMediaDto;
  replaceTypes?: MediaType[];
  onRemove?: () => Promise<unknown>;
  extra?: ReactNode;
}) {
  const { run, pending, error } = useAction();
  const [alt, setAlt] = useState(item.altText ?? "");
  const decorative = item.altText === "";
  const inherited = item.altText === null;
  const media = item.media;
  const isVideo = media.type !== "IMAGE";
  const poster = item.poster ?? media.poster;
  const path = `/blocks/${blockId}/media/${item.id}`;

  return (
    <div className={styles.mediaRow}>
      <Thumb src={isVideo ? (poster?.deliveryUrl ?? null) : thumbnailUrl(media)} large label={media.type} />
      <div className={styles.mediaMeta}>
        <div className={styles.row}>
          <strong>{mediaLabel(media)}</strong>
          <span className={styles.badge}>{media.type}</span>
          {media.width && media.height && (
            <span className={styles.hint}>
              {media.width}×{media.height}
            </span>
          )}
        </div>

        <label className={styles.field}>
          <span>Alt text for this use</span>
          <input
            className={styles.input}
            value={alt}
            maxLength={1000}
            disabled={decorative}
            placeholder={media.altText ? `Library default: ${media.altText}` : "Describe what this shows here"}
            onChange={(event) => setAlt(event.target.value)}
          />
        </label>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.button} ${styles.small}`}
            disabled={pending || decorative || alt === (item.altText ?? "")}
            onClick={() => run(() => api("PATCH", path, { altText: alt.trim() === "" ? null : alt }))}
          >
            Save alt text
          </button>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={decorative}
              disabled={pending}
              onChange={(event) => run(() => api("PATCH", path, { altText: event.target.checked ? "" : null }))}
            />
            Decorative here
          </label>
          {inherited && <span className={styles.hint}>Using the library default.</span>}
        </div>

        {isVideo && (
          <div className={styles.row}>
            <span className={styles.hint}>
              Poster: {item.poster ? "chosen for this placement" : media.poster ? "the video's default" : "none — required on the public page"}
            </span>
            <ChooseMediaButton
              label={item.poster ? "Change poster" : "Use a different poster here"}
              title="Choose a poster for this placement"
              types={["IMAGE"]}
              onSelect={(image) => api("PATCH", path, { posterMediaId: image.id })}
            />
            {item.poster && (
              <button
                type="button"
                className={`${styles.button} ${styles.small}`}
                disabled={pending}
                onClick={() => run(() => api("PATCH", path, { posterMediaId: null }))}
              >
                Use the video&apos;s default
              </button>
            )}
          </div>
        )}

        <div className={styles.row}>
          {replaceTypes && (
            <ChooseMediaButton
              label="Replace…"
              title="Replace this media"
              types={replaceTypes}
              onSelect={async (next) => {
                await api("DELETE", path);
                await api("POST", `/blocks/${blockId}/media`, { mediaId: next.id, position: item.position });
              }}
            />
          )}
          {onRemove && (
            <button
              type="button"
              className={`${styles.button} ${styles.small} ${styles.danger}`}
              disabled={pending}
              onClick={() => run(onRemove)}
            >
              Remove
            </button>
          )}
          {extra}
        </div>
        <ErrorLine error={error} />
      </div>
    </div>
  );
}

// Plain paragraphs of a rich-text TEXT block, one input per paragraph the
// template expects. Saving replaces the content whole.
export function ParagraphsEditor({
  block,
  labels,
  multiline = [],
}: {
  block: BlockDto;
  labels: string[];
  multiline?: boolean[];
}) {
  const content = block.content as { kind: string; paragraphs?: unknown[][] };
  const initial = labels.map((_, i) => {
    const paragraph = content.paragraphs?.[i] ?? [];
    return paragraph.every((run) => typeof run === "string") ? paragraph.join("") : "";
  });
  const formatted = (content.paragraphs ?? []).some((p) => p.some((run) => typeof run !== "string"));
  const [values, setValues] = useState(initial);
  const { run, pending, error } = useAction();
  const dirty = values.some((value, i) => value !== initial[i]);

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      {formatted && <p className={styles.notice}>This text has formatting the page cannot show; saving replaces it with plain text.</p>}
      {labels.map((label, i) => (
        <label key={label} className={styles.field}>
          <span>{label}</span>
          {multiline[i] ? (
            <textarea
              className={styles.textarea}
              value={values[i]}
              maxLength={5000}
              onChange={(event) => setValues(values.map((v, j) => (j === i ? event.target.value : v)))}
            />
          ) : (
            <input
              className={styles.input}
              value={values[i]}
              maxLength={5000}
              onChange={(event) => setValues(values.map((v, j) => (j === i ? event.target.value : v)))}
            />
          )}
        </label>
      ))}
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.button} ${styles.small} ${styles.primary}`}
          disabled={pending || !dirty || values.some((v) => !v.trim())}
          onClick={() =>
            run(() =>
              api("PATCH", `/blocks/${block.id}`, {
                content: { kind: "richText", paragraphs: values.map((value) => [value.trim()]) },
              }),
            )
          }
        >
          Save text
        </button>
        {values.some((v) => !v.trim()) && <span className={styles.hint}>Every line is required.</span>}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

// Collects the paragraphs of a text block that does not exist yet; nothing is
// created until every line is written, so no placeholder copy is ever saved.
export function NewParagraphs({
  labels,
  multiline = [],
  submitLabel,
  onCreate,
}: {
  labels: string[];
  multiline?: boolean[];
  submitLabel: string;
  onCreate: (paragraphs: string[]) => Promise<unknown>;
}) {
  const [values, setValues] = useState(labels.map(() => ""));
  const { run, pending, error } = useAction();
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      {labels.map((label, i) => (
        <label key={label} className={styles.field}>
          <span>{label}</span>
          {multiline[i] ? (
            <textarea
              className={styles.textarea}
              value={values[i]}
              maxLength={5000}
              onChange={(event) => setValues(values.map((v, j) => (j === i ? event.target.value : v)))}
            />
          ) : (
            <input
              className={styles.input}
              value={values[i]}
              maxLength={5000}
              onChange={(event) => setValues(values.map((v, j) => (j === i ? event.target.value : v)))}
            />
          )}
        </label>
      ))}
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.button} ${styles.small} ${styles.primary}`}
          disabled={pending || values.some((v) => !v.trim())}
          onClick={() => run(() => onCreate(values.map((v) => v.trim())))}
        >
          {submitLabel}
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

// Moves one item within its container and sends the complete new order.
export function reorderIds(ids: string[], index: number, delta: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(index, 1);
  next.splice(index + delta, 0, moved);
  return next;
}
