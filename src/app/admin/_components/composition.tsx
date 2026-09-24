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
      <Thumb src={isVideo ? thumbnailUrl(poster) : thumbnailUrl(media)} large label={media.type} />
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
              onClick={() => {
                if (confirm("Remove this media from the block? Its description and poster choice here are lost. The file stays in the Media Library.")) {
                  void run(onRemove);
                }
              }}
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

// A single short field of a block's content, such as a caption or a label.
// Saving replaces the content whole with that field set.
export function ContentFieldEditor({
  block,
  field,
  label,
  max,
}: {
  block: BlockDto;
  field: string;
  label: string;
  max: number;
}) {
  const initial = String((block.content as Record<string, unknown>)[field] ?? "");
  const [value, setValue] = useState(initial);
  const { run, pending, error } = useAction();
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <label className={styles.field}>
        <span>{label}</span>
        <input className={styles.input} value={value} maxLength={max} onChange={(event) => setValue(event.target.value)} />
      </label>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.button} ${styles.small} ${styles.primary}`}
          disabled={pending || !value.trim() || value === initial}
          onClick={() =>
            run(() => api("PATCH", `/blocks/${block.id}`, { content: { ...(block.content as object), [field]: value.trim() } }))
          }
        >
          Save {label.toLowerCase()}
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

// A text block holding one link line: its label and destination.
export function LinkEditor({ block }: { block: BlockDto }) {
  const paragraph = (block.content as { paragraphs?: unknown[][] }).paragraphs?.[0] ?? [];
  const run0 = paragraph[0] as { link?: { href: string; text: string } } | undefined;
  const [text, setText] = useState(run0?.link?.text ?? "");
  const [href, setHref] = useState(run0?.link?.href ?? "");
  const { run, pending, error } = useAction();
  const dirty = text !== (run0?.link?.text ?? "") || href !== (run0?.link?.href ?? "");
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span>Link text</span>
          <input className={styles.input} value={text} maxLength={500} onChange={(event) => setText(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Link to — a site path, https or mailto</span>
          <input className={styles.input} value={href} maxLength={2000} onChange={(event) => setHref(event.target.value)} />
        </label>
      </div>
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.button} ${styles.small} ${styles.primary}`}
          disabled={pending || !dirty || !text.trim() || !href.trim()}
          onClick={() =>
            run(() =>
              api("PATCH", `/blocks/${block.id}`, {
                content: { kind: "richText", paragraphs: [[{ link: { href: href.trim(), text: text.trim() } }]] },
              }),
            )
          }
        >
          Save link
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

// An ordered list of media placements in one block: reorder, remove, add.
export function PlacementList({
  block,
  types,
  addLabel,
}: {
  block: BlockDto;
  types: MediaType[];
  addLabel: string;
}) {
  const { run, pending, error } = useAction();
  const ids = block.media.map((item) => item.id);
  const move = (index: number, delta: number) =>
    run(() => api("PUT", `/blocks/${block.id}/media/order`, { blockMediaIds: reorderIds(ids, index, delta) }));
  return (
    <div>
      {block.media.map((item, index) => (
        <PlacementEditor
          key={item.id + block.updatedAt + item.position}
          blockId={block.id}
          item={item}
          replaceTypes={types}
          onRemove={() => api("DELETE", `/blocks/${block.id}/media/${item.id}`)}
          extra={
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.small} ${styles.icon}`}
                aria-label={`Move item ${index + 1} earlier`}
                disabled={pending || index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.small} ${styles.icon}`}
                aria-label={`Move item ${index + 1} later`}
                disabled={pending || index === ids.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
            </>
          }
        />
      ))}
      <div className={styles.row} style={{ marginTop: 8 }}>
        <ChooseMediaButton
          label={addLabel}
          title={addLabel}
          types={types}
          onSelect={(media) => api("POST", `/blocks/${block.id}/media`, { mediaId: media.id })}
        />
        <span className={styles.hint}>{block.media.length} item(s)</span>
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
