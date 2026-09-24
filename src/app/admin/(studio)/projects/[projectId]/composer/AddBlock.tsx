"use client";

import { useState } from "react";
import type { BlockDto } from "@/features/project-builder/composition.mapper";
import { PATTERNS } from "@/features/project-builder/patterns";
import { PRESETS } from "@/features/project-builder/presets";
import { markupToParagraphs } from "@/features/project-builder/inline-markup";
import { openingSeed } from "@/features/project-builder/templates";
import { api } from "../../../../_components/api";
import { ErrorLine } from "../../../../_components/composition";
import { useAction } from "../../../../_components/useAction";
import studio from "../../../../studio.module.css";
import styles from "./composer.module.css";
import type { ComposerOwner } from "./owner";
import { RichTextField } from "./RichTextField";

// Inserting a block (ADR-0005: at a position, siblings shift in one
// transaction). Every choice creates a block the contract accepts as it
// stands; a block that still needs media says so on its card, and Publish
// refuses it until it has some. Text is written before it is created, so no
// placeholder copy is ever saved.

type Choice = {
  key: string;
  label: string;
  hint: string;
  // Text blocks ask for their words first.
  needsText?: "text" | "caption";
  // Sections that need several short texts ask for all of them first.
  fields?: { label: string; multiline?: boolean }[];
  body: (text?: string, values?: string[]) => Record<string, unknown>;
};

const col = (colStart: number, colSpan: number) => ({ placement: { desktop: { colStart, colSpan } } });
// Text is written with emphasis and links (inline-markup.ts); the form cannot
// submit text that does not parse.
const paragraphs = (text: string) => {
  const parsed = markupToParagraphs(text);
  return parsed.ok ? parsed.paragraphs : [[text.trim()]];
};

const PRESET_CHOICES: Choice[] = [
  {
    key: "projectMeta",
    label: PRESETS.projectMeta.label,
    hint: PRESETS.projectMeta.description,
    body: () => ({ type: "GRID", config: { preset: "projectMeta" }, children: [{ type: "TEXT", content: { kind: "projectFacts" }, config: col(1, 3) }] }),
  },
  {
    key: "projectStills",
    label: PRESETS.projectStills.label,
    hint: PRESETS.projectStills.description,
    body: () => ({ type: "GRID", config: { preset: "projectStills" } }),
  },
  {
    key: "projectLoop",
    label: PRESETS.projectLoop.label,
    hint: `${PRESETS.projectLoop.description} Write the caption; choose the video next.`,
    needsText: "caption",
    body: (text = "") => ({
      type: "GRID",
      config: { preset: "projectLoop" },
      children: [
        { type: "VIDEO", config: { playback: { mode: "AUTOPLAY_VISIBLE" }, fit: "COVER", ...col(1, 8) } },
        { type: "TEXT", content: { kind: "richText", paragraphs: [[text.trim()]] }, config: { role: "caption", ...col(10, 3) } },
      ],
    }),
  },
  {
    key: "projectCredits",
    label: PRESETS.projectCredits.label,
    hint: PRESETS.projectCredits.description,
    body: () => ({ type: "GRID", config: { preset: "projectCredits" }, children: [{ type: "TEXT", content: { kind: "projectCredits" }, config: col(1, 3) }] }),
  },
  {
    key: "projectCoda",
    label: PRESETS.projectCoda.label,
    hint: PRESETS.projectCoda.description,
    body: () => ({ type: "IMAGE", config: { fit: "COVER", preset: "projectCoda" } }),
  },
];

// Home's closed sections (ADR-0018), created whole. The hero opens the page,
// so it is created first; the others go where the author asked.
const HOME_CHOICES: Choice[] = [
  {
    key: "hero",
    label: "Hero",
    hint: "A silent ambient film across the top, over its poster, with a caption. Always first; choose the film next.",
    needsText: "caption",
    body: (text = "") => ({
      type: "HERO",
      position: 0,
      content: { caption: text.trim() },
      config: { playback: { mode: "AUTOPLAY_AMBIENT" }, fit: "COVER" },
    }),
  },
  {
    key: "identity",
    label: PRESETS.homeIdentity.label,
    hint: "The page's name in display type, a lead sentence and an aside. Home shows it once.",
    fields: [{ label: "Display" }, { label: "Lead", multiline: true }, { label: "Aside", multiline: true }],
    body: (_text, [display = "", lead = "", aside = ""] = []) => ({
      type: "GRID",
      config: { preset: "homeIdentity" },
      children: [
        { type: "TEXT", content: { kind: "richText", paragraphs: [[display.trim()]] }, config: { role: "display", ...col(1, 12) } },
        { type: "TEXT", content: { kind: "richText", paragraphs: [[lead.trim()]] }, config: { role: "lead", ...col(1, 5) } },
        { type: "TEXT", content: { kind: "richText", paragraphs: [[aside.trim()]] }, config: { role: "aside", ...col(9, 4) } },
      ],
    }),
  },
  {
    key: "wall",
    label: PRESETS.homeWall.label,
    hint: "Stills and silent loops that play while visible, three across. Add the tiles next.",
    fields: [{ label: "Label" }],
    body: (_text, [label = ""] = []) => ({
      type: "GALLERY",
      content: { label: label.trim() },
      config: {
        mode: "VIDEO_GRID",
        columns: { desktop: 3, tablet: 2, mobile: 2 },
        playback: { mode: "AUTOPLAY_VISIBLE" },
        fit: "COVER",
        preset: "homeWall",
      },
    }),
  },
  {
    key: "about",
    label: PRESETS.homeAbout.label,
    hint: "A paragraph, a link on to About and a portrait. Choose the portrait next.",
    fields: [{ label: "Paragraph", multiline: true }, { label: "Link text" }, { label: "Link to (for example /about)" }],
    body: (_text, [body = "", linkText = "", href = ""] = []) => ({
      type: "GRID",
      config: { preset: "homeAbout" },
      children: [
        { type: "TEXT", content: { kind: "richText", paragraphs: [[body.trim()]] }, config: { role: "body", ...col(1, 6) } },
        {
          type: "TEXT",
          content: { kind: "richText", paragraphs: [[{ link: { href: href.trim(), text: linkText.trim() } }]] },
          config: { role: "more", ...col(1, 6) },
        },
        { type: "IMAGE", config: col(10, 3) },
      ],
    }),
  },
  {
    key: "frames",
    label: "Frames",
    hint: "Stills in justified rows, at their own proportions. Add the stills next.",
    fields: [{ label: "Label" }],
    body: (_text, [label = ""] = []) => ({ type: "GALLERY", content: { label: label.trim() }, config: { mode: "JUSTIFIED_ROWS" } }),
  },
];

// Reusable patterns (3C-9): ordinary blocks, inserted once, never linked.
const PATTERN_CHOICES: Choice[] = PATTERNS.map((pattern) => ({
  key: `pattern-${pattern.key}`,
  label: pattern.label,
  hint: pattern.description,
  ...(pattern.fields.length ? { fields: pattern.fields } : {}),
  body: (_text, values = []) => pattern.build(values),
}));

const ROOT_CHOICES: Choice[] = [
  { key: "text", label: "Text", hint: "Paragraphs in the page's text column.", needsText: "text", body: (text = "") => ({ type: "TEXT", content: { kind: "richText", paragraphs: paragraphs(text) }, config: { role: "body" } }) },
  { key: "image", label: "Image", hint: "One image at its own proportions, with an optional caption.", body: () => ({ type: "IMAGE", config: { fit: "CONTAIN" } }) },
  { key: "video", label: "Video", hint: "One video in its own frame; plays on request unless you choose otherwise.", body: () => ({ type: "VIDEO", config: { playback: { mode: "CLICK_TO_PLAY" }, fit: "COVER" } }) },
  { key: "hero", label: "Full-bleed media", hint: "An image or film across the whole width.", body: () => ({ type: "HERO", config: { fit: "COVER" } }) },
  { key: "grid", label: "Columns", hint: "Place text, images and video side by side on 12 columns; phones stack them.", body: () => ({ type: "GRID" }) },
  { key: "gallery", label: "Gallery", hint: "A flow of media: justified rows, a strip, a slideshow or a video wall.", body: () => ({ type: "GALLERY", config: { mode: "JUSTIFIED_ROWS" } }) },
  { key: "spacer", label: "Space", hint: "Extra breathing room between blocks.", body: () => ({ type: "SPACER", config: { size: "M" } }) },
];

const CHILD_CHOICES: Choice[] = [
  { key: "text", label: "Text", hint: "Paragraphs in a column.", needsText: "text", body: (text = "") => ({ type: "TEXT", content: { kind: "richText", paragraphs: paragraphs(text) }, config: { role: "body", ...col(1, 6) } }) },
  { key: "image", label: "Image", hint: "An image in a column.", body: () => ({ type: "IMAGE", config: { fit: "CONTAIN", ...col(1, 6) } }) },
  { key: "video", label: "Video", hint: "A video in a column.", body: () => ({ type: "VIDEO", config: { playback: { mode: "CLICK_TO_PLAY" }, fit: "COVER", ...col(1, 6) } }) },
  { key: "facts", label: "Facts", hint: "Year, runtime, client and role from Details.", body: () => ({ type: "TEXT", content: { kind: "projectFacts" }, config: col(1, 4) }) },
  { key: "credits", label: "Credits", hint: "The credit list from Details.", body: () => ({ type: "TEXT", content: { kind: "projectCredits" }, config: col(1, 4) }) },
  { key: "spacer", label: "Space", hint: "An empty cell.", body: () => ({ type: "SPACER", config: { size: "S" } }) },
];

export function AddBlock({
  owner,
  parentBlockId,
  position,
  hasOpening,
  label = "Add block",
  initiallyOpen = false,
  onCreated,
  onCancel,
}: {
  owner: ComposerOwner;
  // null: the page's top level; a GRID's id: inside its columns.
  parentBlockId: string | null;
  // Where the new block goes; omitted appends.
  position?: number;
  // A project: whether it has its opening. Home: whether it has its hero.
  hasOpening: boolean;
  label?: string;
  initiallyOpen?: boolean;
  onCreated?: (block: BlockDto) => void;
  onCancel?: () => void;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [asking, setAsking] = useState<Choice | null>(null);
  const [text, setText] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const close = () => {
    setOpen(false);
    setAsking(null);
    onCancel?.();
  };
  const { run, pending, error } = useAction();
  const nested = parentBlockId !== null;
  const home = owner.kind === "page";

  const create = (choice: Choice, words?: string, fields?: string[]) =>
    run(async () => {
      const body = choice.body(words, fields);
      const block = await api<BlockDto>("POST", `${owner.path}/blocks`, {
        ...body,
        ...(nested ? { parentBlockId } : {}),
        // A choice that names its own place (the hero) keeps it.
        ...(position === undefined || "position" in body ? {} : { position }),
      });
      setOpen(false);
      setAsking(null);
      setText("");
      setValues([]);
      onCreated?.(block);
    });

  const addOpening = () =>
    run(async () => {
      const block = await api<BlockDto>("POST", `${owner.path}/blocks`, { ...openingSeed(true), position: 0 });
      setOpen(false);
      onCreated?.(block);
    });

  const pick = (choice: Choice) => (choice.needsText || choice.fields ? setAsking(choice) : create(choice));
  const setValue = (i: number, value: string) => setValues((current) => Object.assign([...current], { [i]: value }));

  const choiceButton = (choice: Choice) => (
    <button key={choice.key} type="button" className={styles.choice} disabled={pending} onClick={() => pick(choice)}>
      <strong>{choice.label}</strong>
      <span>{choice.hint}</span>
    </button>
  );

  if (!open) {
    return (
      <div className={styles.addRow}>
        <button type="button" className={`${studio.button} ${studio.small} ${styles.add}`} onClick={() => setOpen(true)}>
          + {label}
        </button>
      </div>
    );
  }

  const backButton = (
    <button type="button" className={`${studio.button} ${studio.small}`} onClick={() => setAsking(null)}>
      Back
    </button>
  );

  return (
    <div className={styles.addPanel} role="group" aria-label={label}>
      {asking?.fields ? (
        <form
          className={styles.stack}
          onSubmit={(event) => {
            event.preventDefault();
            void create(asking, undefined, asking.fields!.map((_, i) => values[i] ?? ""));
          }}
        >
          {asking.fields.map((field, i) => (
            <label key={field.label} className={studio.field}>
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea className={studio.textarea} rows={3} value={values[i] ?? ""} maxLength={5000} autoFocus={i === 0} onChange={(event) => setValue(i, event.target.value)} />
              ) : (
                <input className={studio.input} value={values[i] ?? ""} maxLength={500} autoFocus={i === 0} onChange={(event) => setValue(i, event.target.value)} />
              )}
            </label>
          ))}
          <div className={studio.row}>
            <button
              type="submit"
              className={`${studio.button} ${studio.small} ${studio.primary}`}
              disabled={pending || asking.fields.some((_, i) => !(values[i] ?? "").trim())}
            >
              Add {asking.label.toLowerCase()}
            </button>
            {backButton}
          </div>
        </form>
      ) : asking ? (
        <form
          className={styles.stack}
          onSubmit={(event) => {
            event.preventDefault();
            void create(asking, text);
          }}
        >
          {asking.needsText === "caption" ? (
            <label className={studio.field}>
              <span>Caption</span>
              <textarea className={studio.textarea} rows={4} value={text} maxLength={5000} autoFocus onChange={(event) => setText(event.target.value)} />
            </label>
          ) : (
            <RichTextField label="Text" value={text} onChange={setText} disabled={pending} />
          )}
          <div className={studio.row}>
            <button type="submit" className={`${studio.button} ${studio.small} ${studio.primary}`} disabled={pending || !text.trim() || (asking.needsText === "text" && !markupToParagraphs(text).ok)}>
              Add {asking.label.toLowerCase()}
            </button>
            {backButton}
          </div>
        </form>
      ) : (
        <>
          {home ? (
            <>
              <p className={styles.groupLabel}>Home sections</p>
              <div className={styles.choices}>{HOME_CHOICES.filter((choice) => choice.key !== "hero" || !hasOpening).map(choiceButton)}</div>
            </>
          ) : (
            <>
              {!nested && (
                <>
                  <p className={styles.groupLabel}>Project Detail presets</p>
                  <div className={styles.choices}>
                    {!hasOpening && (
                      <button type="button" className={styles.choice} disabled={pending} onClick={addOpening}>
                        <strong>Opening</strong>
                        <span>A film or image under the title, always first.</span>
                      </button>
                    )}
                    {PRESET_CHOICES.map(choiceButton)}
                  </div>
                  <p className={styles.groupLabel}>Patterns</p>
                  <div className={styles.choices}>{PATTERN_CHOICES.map(choiceButton)}</div>
                  <p className={styles.groupLabel}>Blocks</p>
                </>
              )}
              <div className={styles.choices}>{(nested ? CHILD_CHOICES : ROOT_CHOICES).map(choiceButton)}</div>
            </>
          )}
          <div className={studio.row}>
            <button type="button" className={`${studio.button} ${studio.small}`} onClick={close}>
              Cancel
            </button>
          </div>
        </>
      )}
      <ErrorLine error={error} />
    </div>
  );
}
