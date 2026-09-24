"use client";

import { Fragment, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Paragraph } from "@/features/project-builder/block.schema";
import { markupToParagraphs } from "@/features/project-builder/inline-markup";
import studio from "../../../../studio.module.css";
import styles from "./composer.module.css";

// A bounded rich-text field (Phase 3B): the words, plus the two kinds of
// formatting the block contract stores — emphasis and links. The toolbar and
// its shortcuts write the editing notation of inline-markup.ts into the
// textarea; the preview below shows what the page will show. There is no HTML
// and no other formatting to reach.

export function RichTextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [linking, setLinking] = useState<{ start: number; end: number } | null>(null);
  const [href, setHref] = useState("");
  const helpId = useId();
  const parsed = markupToParagraphs(value);

  // Wraps the selection (or inserts a placeholder word, selected).
  const wrap = (before: string, after: string, placeholder: string, range?: { start: number; end: number }) => {
    const el = area.current;
    if (!el) return;
    const start = range?.start ?? el.selectionStart;
    const end = range?.end ?? el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const emphasise = () => wrap("*", "*", "words");
  const startLink = () => {
    const el = area.current;
    if (!el) return;
    setLinking({ start: el.selectionStart, end: el.selectionEnd });
    setHref("");
  };
  const applyLink = () => {
    if (!linking || !href.trim()) return;
    wrap("[", `](${href.trim()})`, "link words", linking);
    setLinking(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      emphasise();
    } else if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      startLink();
    }
  };

  return (
    <div className={styles.richText}>
      <div className={styles.richToolbar} role="toolbar" aria-label={`${label} formatting`}>
        <button type="button" className={`${studio.button} ${studio.small}`} disabled={disabled} onClick={emphasise} title="Emphasis (Ctrl+I)">
          <em>Emphasis</em>
        </button>
        <button type="button" className={`${studio.button} ${studio.small}`} disabled={disabled} onClick={startLink} title="Link (Ctrl+K)">
          <span className={styles.linkSample}>Link</span>
        </button>
        <span className={studio.hint} id={helpId}>
          Select words, then Emphasis or Link. A blank line starts a new paragraph.
        </span>
      </div>
      {linking && (
        <div className={styles.linkForm}>
          <label className={studio.field}>
            <span>Link to — a site path (/works), an https:// address or mailto:</span>
            <input
              className={studio.input}
              value={href}
              maxLength={2000}
              autoFocus
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setLinking(null);
                  area.current?.focus();
                }
              }}
            />
          </label>
          <div className={studio.row}>
            <button type="button" className={`${studio.button} ${studio.small} ${studio.primary}`} disabled={!href.trim()} onClick={applyLink}>
              Add link
            </button>
            <button type="button" className={`${studio.button} ${studio.small}`} onClick={() => setLinking(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <label className={studio.field}>
        <span>{label}</span>
        <textarea
          ref={area}
          className={studio.textarea}
          value={value}
          maxLength={20000}
          rows={5}
          disabled={disabled}
          aria-describedby={helpId}
          aria-invalid={!parsed.ok || undefined}
          onKeyDown={onKeyDown}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {parsed.ok ? (
        <div className={styles.richPreview} aria-label="How the page shows it">
          {parsed.paragraphs.map((paragraph, i) => (
            <p key={i}>
              <PreviewRuns paragraph={paragraph} />
            </p>
          ))}
        </div>
      ) : (
        <p className={studio.error} role="alert">
          {parsed.error}
        </p>
      )}
    </div>
  );
}

function PreviewRuns({ paragraph }: { paragraph: Paragraph }) {
  return paragraph.map((run, i) => {
    if (typeof run === "string") return <Fragment key={i}>{run}</Fragment>;
    if ("em" in run) return <em key={i}>{run.em}</em>;
    return (
      <span key={i} className={styles.linkSample} title={run.link.href}>
        {run.link.text}
      </span>
    );
  });
}
