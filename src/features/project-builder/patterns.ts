import { markupToParagraphs } from "./inline-markup";

// Reusable patterns (Phase 3C-9): small, code-defined arrangements of the
// ordinary block types that the composer inserts in one request. Like
// templates (ADR-0013 §1) they are copied once and never linked: changing a
// pattern here never changes a page that used it. They carry no media and no
// placeholder copy — the author writes the words first and chooses the media
// next — and they are valid only on a project, whose generic renderer draws
// them; Home is built from its own sections (ADR-0018).

export type PatternField = { label: string; multiline?: boolean; markup?: boolean };

export type Pattern = {
  key: string;
  label: string;
  description: string;
  fields: PatternField[];
  build: (values: string[]) => Record<string, unknown>;
};

const col = (colStart: number, colSpan: number) => ({ placement: { desktop: { colStart, colSpan } } });

const paragraphs = (text: string) => {
  const parsed = markupToParagraphs(text);
  return parsed.ok ? parsed.paragraphs : [[text.trim()]];
};

export const PATTERNS: Pattern[] = [
  {
    key: "textAndStill",
    label: "Text and still",
    description: "A paragraph beside a still, side by side on 12 columns; phones stack them.",
    fields: [{ label: "Text", multiline: true, markup: true }],
    build: ([text = ""]) => ({
      type: "GRID",
      children: [
        { type: "TEXT", content: { kind: "richText", paragraphs: paragraphs(text) }, config: { role: "body", ...col(1, 5) } },
        { type: "IMAGE", config: { fit: "CONTAIN", ...col(7, 6) } },
      ],
    }),
  },
  {
    key: "filmAndCredits",
    label: "Film and credits",
    description: "A film that plays on request, with the credit list from Details beside it.",
    fields: [],
    build: () => ({
      type: "GRID",
      children: [
        { type: "VIDEO", config: { playback: { mode: "CLICK_TO_PLAY" }, fit: "COVER", ...col(1, 8) } },
        { type: "TEXT", content: { kind: "projectCredits" }, config: col(10, 3) },
      ],
    }),
  },
  {
    key: "imagePair",
    label: "Editorial image pair",
    description: "Two stills set asymmetrically: a wide one, then a narrower one offset to the right.",
    fields: [],
    build: () => ({
      type: "GRID",
      children: [
        { type: "IMAGE", config: { fit: "CONTAIN", placement: { desktop: { colStart: 1, colSpan: 7 }, valign: "start" } } },
        { type: "IMAGE", config: { fit: "CONTAIN", placement: { desktop: { colStart: 9, colSpan: 4 }, valign: "end" } } },
      ],
    }),
  },
  {
    key: "gallerySection",
    label: "Gallery section",
    description: "A labelled run of stills in justified rows, at their own proportions.",
    fields: [{ label: "Label" }],
    build: ([label = ""]) => ({ type: "GALLERY", content: { label: label.trim() }, config: { mode: "JUSTIFIED_ROWS" } }),
  },
];
