"use client";

import { useState } from "react";
import type { MediaDto } from "@/features/media/media.mapper";
import { api } from "../../../../_components/api";
import { ChooseMediaButton, ErrorLine, PlacementEditor, PlacementList } from "../../../../_components/composition";
import { useAction } from "../../../../_components/useAction";
import studio from "../../../../studio.module.css";
import type { Paragraph } from "@/features/project-builder/block.schema";
import { markupToParagraphs, paragraphsToMarkup } from "@/features/project-builder/inline-markup";
import { configOf, GALLERY_MODES, isOpening, TEXT_ROLE_LABELS, type Block } from "./blockInfo";
import styles from "./composer.module.css";
import { RichTextField } from "./RichTextField";

// The editing controls of each block type. Every change is one PATCH of the
// block's whole `content` or `config`, validated on the server by the block
// contract; nothing here writes CSS, pixels or colours — only the closed
// options the contract allows (ADR-0006, ADR-0008, ADR-0013).

type MediaType = MediaDto["type"];

const patchConfig = (block: Block, config: Record<string, unknown>) => api("PATCH", `/blocks/${block.id}`, { config });

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={studio.field}>
      <span>{label}</span>
      <select className={studio.select} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

// An optional short field of the block's content (a caption, a label):
// saving an empty value removes it.
export function OptionalField({ block, field, label, max }: { block: Block; field: string; label: string; max: number }) {
  const content = block.content as Record<string, unknown>;
  const initial = typeof content[field] === "string" ? (content[field] as string) : "";
  const [value, setValue] = useState(initial);
  const { run, pending, error } = useAction();
  const save = () => {
    const next = { ...content };
    if (value.trim()) next[field] = value.trim();
    else delete next[field];
    return run(() => api("PATCH", `/blocks/${block.id}`, { content: next }));
  };
  return (
    <div className={styles.stack}>
      <label className={studio.field}>
        <span>{label}</span>
        <input className={studio.input} value={value} maxLength={max} onChange={(event) => setValue(event.target.value)} />
      </label>
      <div className={studio.row}>
        <button type="button" className={`${studio.button} ${studio.small}`} disabled={pending || value === initial} onClick={save}>
          {value.trim() ? "Save" : "Remove"} {label.replace(/ \(optional\)$/, "").toLowerCase()}
        </button>
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

// ---- Media ----

// One media item: the placement (alt, poster, replace) or the chooser.
export function SingleMedia({
  block,
  types,
  title,
  onChosen,
}: {
  block: Block;
  types: MediaType[];
  title: string;
  // Runs after a medium is placed, e.g. to set the playback a video needs.
  onChosen?: (media: MediaDto) => Promise<unknown>;
}) {
  const item = block.media[0];
  if (item) return <PlacementEditor key={item.id + block.updatedAt} blockId={block.id} item={item} replaceTypes={types} />;
  return (
    <div className={studio.row}>
      <ChooseMediaButton
        label={title}
        title={title}
        types={types}
        primary
        onSelect={async (media) => {
          await api("POST", `/blocks/${block.id}/media`, { mediaId: media.id });
          await onChosen?.(media);
        }}
      />
    </div>
  );
}

export function FitControl({ block }: { block: Block }) {
  const { run, pending, error } = useAction();
  const config = configOf(block);
  return (
    <>
      <Select
        label="Framing"
        value={config.fit ?? "COVER"}
        disabled={pending}
        options={[
          ["COVER", "Fill the frame (may crop)"],
          ["CONTAIN", "Whole picture (no crop)"],
        ]}
        onChange={(fit) => run(() => patchConfig(block, { ...(block.config as object), fit }))}
      />
      <ErrorLine error={error} />
    </>
  );
}

// AUTOPLAY_AMBIENT only on a standalone surface (ADR-0008); a GRID child or a
// gallery never offers it.
export function PlaybackControl({ block, standalone }: { block: Block; standalone: boolean }) {
  const { run, pending, error } = useAction();
  const config = configOf(block);
  const options: [string, string][] = [
    ["CLICK_TO_PLAY", "On request, with sound"],
    ["AUTOPLAY_VISIBLE", "Silently while visible (loops)"],
  ];
  if (standalone) options.push(["AUTOPLAY_AMBIENT", "Silently as ambience (standalone only)"]);
  return (
    <>
      <Select
        label="Playback"
        value={config.playback?.mode ?? "CLICK_TO_PLAY"}
        disabled={pending}
        options={options}
        onChange={(mode) => run(() => patchConfig(block, { ...(block.config as object), playback: { mode } }))}
      />
      <ErrorLine error={error} />
    </>
  );
}

// ---- Text ----

// Words with emphasis and links (Phase 3B). Saving replaces the content whole
// with the parsed runs; what cannot parse is shown and not saved.
export function TextEditor({ block, roles }: { block: Block; roles: boolean }) {
  const content = block.content as { kind: string; paragraphs?: Paragraph[] };
  const initial = paragraphsToMarkup(content.paragraphs ?? []);
  const [text, setText] = useState(initial);
  const { run, pending, error } = useAction();
  const config = configOf(block);
  const parsed = markupToParagraphs(text);

  if (content.kind !== "richText") {
    return <p className={studio.hint}>Derived from the project&apos;s Details — edit it there.</p>;
  }
  return (
    <div className={styles.stack}>
      {roles && (
        <Select
          label="Type role"
          value={config.role ?? "body"}
          disabled={pending}
          options={Object.entries(TEXT_ROLE_LABELS)}
          onChange={(role) => run(() => patchConfig(block, { ...(block.config as object), role }))}
        />
      )}
      <RichTextField label="Text" value={text} onChange={setText} disabled={pending} />
      <div className={studio.row}>
        <button
          type="button"
          className={`${studio.button} ${studio.small} ${studio.primary}`}
          disabled={pending || !parsed.ok || text === initial}
          onClick={() => parsed.ok && run(() => api("PATCH", `/blocks/${block.id}`, { content: { kind: "richText", paragraphs: parsed.paragraphs } }))}
        >
          Save text
        </button>
        {text !== initial && <span className={studio.hint}>Unsaved changes</span>}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

// ---- GRID placement ----

type Span = { colStart: number; colSpan: number };
type Placement = { desktop: Span; tablet?: Span; mobile?: Span; align?: string; valign?: string };

const COLUMNS = Array.from({ length: 12 }, (_, i) => i + 1);

// A logical 12-column span: start and width, never pixels (ADR-0006).
function SpanPicker({ label, span, onChange, disabled }: { label: string; span: Span; onChange: (span: Span) => void; disabled?: boolean }) {
  return (
    // A named group, so "From column" and "across" say which width they set.
    // The selects stay enabled while a save runs, so keyboard focus is never
    // dropped; a change made meanwhile is ignored (3D-8).
    <div className={styles.spanPicker} role="group" aria-label={label}>
      <span className={styles.spanLabel}>{label}</span>
      <div className={styles.spanBar} aria-hidden="true">
        {COLUMNS.map((c) => (
          <span key={c} data-on={c >= span.colStart && c < span.colStart + span.colSpan ? "" : undefined} />
        ))}
      </div>
      <label>
        From column{" "}
        <select
          className={studio.select}
          value={span.colStart}
          aria-disabled={disabled || undefined}
          onChange={(event) => {
            if (disabled) return;
            const colStart = Number(event.target.value);
            onChange({ colStart, colSpan: Math.min(span.colSpan, 13 - colStart) });
          }}
        >
          {COLUMNS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        across{" "}
        <select
          className={studio.select}
          value={span.colSpan}
          aria-disabled={disabled || undefined}
          onChange={(event) => !disabled && onChange({ colStart: span.colStart, colSpan: Number(event.target.value) })}
        >
          {COLUMNS.filter((c) => span.colStart + c <= 13).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>{" "}
        columns
      </label>
    </div>
  );
}

export function PlacementControl({ block }: { block: Block }) {
  const { run, pending, error } = useAction();
  const stored = configOf(block).placement as Placement | undefined;
  const placement: Placement = stored ?? { desktop: { colStart: 1, colSpan: 12 } };
  const save = (next: Placement) => run(() => patchConfig(block, { ...(block.config as object), placement: next }));
  const without = (key: "tablet" | "mobile") => {
    const next = { ...placement };
    delete next[key];
    return next;
  };

  return (
    <div className={styles.placement}>
      <SpanPicker label="Desktop" span={placement.desktop} disabled={pending} onChange={(desktop) => save({ ...placement, desktop })} />
      <label className={studio.check}>
        <input
          type="checkbox"
          checked={Boolean(placement.tablet)}
          disabled={pending}
          onChange={(event) => save(event.target.checked ? { ...placement, tablet: placement.desktop } : without("tablet"))}
        />
        Tablet differs from desktop
      </label>
      {placement.tablet && <SpanPicker label="Tablet" span={placement.tablet} disabled={pending} onChange={(tablet) => save({ ...placement, tablet })} />}
      <label className={studio.check}>
        <input
          type="checkbox"
          checked={Boolean(placement.mobile)}
          disabled={pending}
          onChange={(event) => save(event.target.checked ? { ...placement, mobile: { colStart: 1, colSpan: 12 } } : without("mobile"))}
        />
        Phones: place it instead of stacking full width
      </label>
      {placement.mobile && <SpanPicker label="Phone" span={placement.mobile} disabled={pending} onChange={(mobile) => save({ ...placement, mobile })} />}
      <div className={studio.grid2}>
        <Select
          label="Horizontal alignment"
          value={placement.align ?? "stretch"}
          disabled={pending}
          options={[
            ["stretch", "Fill its columns"],
            ["start", "Start"],
            ["center", "Centre"],
            ["end", "End"],
          ]}
          onChange={(align) => save({ ...placement, align })}
        />
        <Select
          label="Vertical alignment"
          value={placement.valign ?? "start"}
          disabled={pending}
          options={[
            ["start", "Top"],
            ["center", "Middle"],
            ["end", "Bottom"],
            ["stretch", "Full row height"],
          ]}
          onChange={(valign) => save({ ...placement, valign })}
        />
      </div>
      <p className={studio.hint}>Tablets follow desktop and phones stack in the list&apos;s order unless you say otherwise.</p>
      <ErrorLine error={error} />
    </div>
  );
}

// ---- GALLERY ----

export function GalleryEditor({ block }: { block: Block }) {
  const { run, pending, error } = useAction();
  const config = block.config as {
    mode: string;
    columns?: { desktop: number; tablet: number; mobile: number };
    playback?: { mode: string };
    fit?: string;
  };
  const save = (next: Record<string, unknown>) => run(() => patchConfig(block, next));
  const columns = config.columns ?? { desktop: 3, tablet: 2, mobile: 1 };
  const setColumns = (key: "desktop" | "tablet" | "mobile", value: number) => {
    const next = { ...columns, [key]: value };
    // Column counts never grow at narrower widths.
    next.tablet = Math.min(next.tablet, next.desktop);
    next.mobile = Math.min(next.mobile, next.tablet);
    save({ ...config, columns: next });
  };
  const types: MediaType[] = config.mode === "JUSTIFIED_ROWS" ? ["IMAGE"] : ["IMAGE", "VIDEO"];

  return (
    <div className={styles.stack}>
      <div className={studio.grid2}>
        <Select
          label="Presentation"
          value={config.mode}
          disabled={pending}
          options={Object.entries(GALLERY_MODES)}
          onChange={(mode) =>
            save(
              mode === "VIDEO_GRID"
                ? { mode, columns: { desktop: 3, tablet: 2, mobile: 1 }, playback: { mode: "AUTOPLAY_VISIBLE" }, fit: "COVER" }
                : { mode },
            )
          }
        />
        <OptionalField key={block.updatedAt} block={block} field="label" label="Label (optional)" max={200} />
      </div>
      {config.mode === "VIDEO_GRID" && (
        <div className={studio.grid3}>
          {(["desktop", "tablet", "mobile"] as const).map((key) => (
            <Select
              key={key}
              label={`Columns · ${key}`}
              value={String(columns[key])}
              disabled={pending}
              options={Array.from({ length: { desktop: 6, tablet: 4, mobile: 2 }[key] }, (_, i) => [String(i + 1), String(i + 1)])}
              onChange={(value) => setColumns(key, Number(value))}
            />
          ))}
          <Select
            label="Playback"
            value={config.playback?.mode ?? "AUTOPLAY_VISIBLE"}
            disabled={pending}
            options={[
              ["AUTOPLAY_VISIBLE", "Silently while visible"],
              ["CLICK_TO_PLAY", "On request, with sound"],
            ]}
            onChange={(mode) => save({ ...config, playback: { mode } })}
          />
          <Select
            label="Framing"
            value={config.fit ?? "COVER"}
            disabled={pending}
            options={[
              ["COVER", "Fill each tile"],
              ["CONTAIN", "Whole picture"],
            ]}
            onChange={(fit) => save({ ...config, fit })}
          />
        </div>
      )}
      {config.mode === "JUSTIFIED_ROWS" && <p className={studio.hint}>Justified rows lay out stills; use a video wall, strip or slideshow for video.</p>}
      <ErrorLine error={error} />
      <PlacementList block={block} types={types} addLabel="Add media" />
    </div>
  );
}

// ---- SPACER ----

export function SpacerEditor({ block }: { block: Block }) {
  const { run, pending, error } = useAction();
  return (
    <>
      <Select
        label="Size"
        value={configOf(block).size ?? "M"}
        disabled={pending}
        options={[
          ["S", "Small — half a band"],
          ["M", "Medium — one band"],
          ["L", "Large — two bands"],
        ]}
        onChange={(size) => run(() => patchConfig(block, { size }))}
      />
      <ErrorLine error={error} />
    </>
  );
}

// ---- IMAGE, VIDEO, HERO ----

export function ImageEditor({ block, root }: { block: Block; root: boolean }) {
  const { run, pending, error } = useAction();
  const config = block.config as { preset?: string; fit?: string; placement?: unknown };
  return (
    <div className={styles.stack}>
      <SingleMedia block={block} types={["IMAGE"]} title="Choose image" />
      {root && (
        <Select
          label="Presentation"
          value={config.preset ?? ""}
          disabled={pending}
          options={[
            ["", "Inline, at its own proportions"],
            ["projectCoda", "Closing image — full bleed"],
          ]}
          onChange={(preset) => {
            const next: Record<string, unknown> = { ...config };
            if (preset) next.preset = preset;
            else delete next.preset;
            run(() => patchConfig(block, next));
          }}
        />
      )}
      {!config.preset && <OptionalField key={block.updatedAt} block={block} field="caption" label="Caption (optional)" max={500} />}
      <ErrorLine error={error} />
    </div>
  );
}

export function VideoEditor({ block, standalone }: { block: Block; standalone: boolean }) {
  return (
    <div className={styles.stack}>
      <SingleMedia block={block} types={["VIDEO"]} title="Choose video" />
      <div className={studio.grid2}>
        <PlaybackControl block={block} standalone={standalone} />
        <FitControl block={block} />
      </div>
    </div>
  );
}

// The opening shows a film (on request) or an image under the title; without
// either, the project's cover. A film needs CLICK_TO_PLAY (ADR-0010).
export function HeroEditor({ block, standalone }: { block: Block; standalone: boolean }) {
  const { run, pending, error } = useAction();
  const opening = isOpening(block);
  const setFilmPlayback = (media: MediaDto) =>
    media.type === "VIDEO" && configOf(block).playback?.mode !== "CLICK_TO_PLAY"
      ? patchConfig(block, { ...(block.config as object), playback: { mode: "CLICK_TO_PLAY" } })
      : Promise.resolve();
  return (
    <div className={styles.stack}>
      {opening && (
        <p className={studio.hint}>
          The project&apos;s title and Back to works sit over this frame. A film plays when the visitor asks; without a film or image the page opens on the cover.
        </p>
      )}
      <SingleMedia block={block} types={["VIDEO", "IMAGE"]} title="Choose a film or image" onChosen={opening ? setFilmPlayback : undefined} />
      {opening && block.media[0] && (
        <div className={studio.row}>
          <button
            type="button"
            className={`${studio.button} ${studio.small}`}
            disabled={pending}
            onClick={() => run(() => api("DELETE", `/blocks/${block.id}/media/${block.media[0].id}`))}
          >
            Open on the cover instead
          </button>
        </div>
      )}
      <ErrorLine error={error} />
      {!opening && (
        <>
          <div className={studio.grid2}>
            {block.media[0]?.media.type !== "IMAGE" && <PlaybackControl block={block} standalone={standalone} />}
            <FitControl block={block} />
          </div>
          <OptionalField key={block.updatedAt} block={block} field="caption" label="Caption (optional)" max={300} />
        </>
      )}
    </div>
  );
}
