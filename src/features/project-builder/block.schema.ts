import { z } from "zod";

// The persistent block contract (ADR-0006, ADR-0008, ADR-0010, ADR-0011,
// ADR-0013). Every block is validated as a discriminated union on its type:
// `content` is editorial data, `config` presentation and layout. Objects are
// strict, so an unknown key — a colour, a typeface, a derived playback flag, an
// authored title — is rejected rather than ignored. JSONB is only the storage
// format; nothing leaves this module unvalidated.

export const BLOCK_TYPES = ["HERO", "TEXT", "IMAGE", "VIDEO", "GRID", "GALLERY", "SPACER"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

// A GRID may contain only these; nesting depth is exactly one.
export const LEAF_BLOCK_TYPES = ["HERO", "TEXT", "IMAGE", "VIDEO", "SPACER"] as const satisfies readonly BlockType[];

// ---- Shared primitives ----

const text = (max: number) => z.string().min(1).max(max);

const isSafeHref = (value: string) =>
  /^\/(?!\/)\S*$/.test(value) || /^https:\/\/\S+$/.test(value) || /^mailto:[^\s@]+@[^\s@]+$/.test(value);

const href = z.string().max(2000).refine(isSafeHref, "must be a site path, an https URL or a mailto address");

// Inline runs: plain text, emphasis, or a link. No HTML, no Markdown.
export const inlineRunSchema = z.union([
  text(5000),
  z.strictObject({ em: text(5000) }),
  z.strictObject({ link: z.strictObject({ href, text: text(500) }) }),
]);
export type InlineRun = z.infer<typeof inlineRunSchema>;

export const paragraphSchema = z.array(inlineRunSchema).min(1).max(200);
export type Paragraph = z.infer<typeof paragraphSchema>;

const column = z.int().min(1).max(12);
const spanFits = (value: { colStart: number; colSpan: number }) => value.colStart + value.colSpan <= 13;
const spanMessage = "colStart + colSpan must not exceed 13 on the 12-column grid";

const spanSchema = z.strictObject({ colStart: column, colSpan: column }).refine(spanFits, spanMessage);

const alignment = z.enum(["start", "center", "end", "stretch"]);

// Placement inside a GRID: logical columns per breakpoint, never pixels. The
// breakpoint set is closed; tablet and mobile derive when omitted.
export const placementSchema = z.strictObject({
  desktop: spanSchema,
  tablet: spanSchema.optional(),
  mobile: spanSchema.optional(),
  align: alignment.optional(),
  valign: alignment.optional(),
});

// Playback is one discriminated mode. autoplay, muted, playsInline, preload and
// pauseWhenOffscreen are derived from it and are rejected as input; controls
// exist only for CLICK_TO_PLAY (ADR-0008).
export const playbackSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("CLICK_TO_PLAY"), loop: z.boolean().optional(), controls: z.boolean().optional() }),
  z.strictObject({ mode: z.literal("AUTOPLAY_VISIBLE"), loop: z.boolean().optional() }),
  z.strictObject({ mode: z.literal("AUTOPLAY_AMBIENT"), loop: z.boolean().optional() }),
]);
export type Playback = z.infer<typeof playbackSchema>;

// Multi-item surfaces never take AUTOPLAY_AMBIENT, not even as a default.
const multiItemPlaybackSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("CLICK_TO_PLAY"), loop: z.boolean().optional(), controls: z.boolean().optional() }),
  z.strictObject({ mode: z.literal("AUTOPLAY_VISIBLE"), loop: z.boolean().optional() }),
]);

const fit = z.enum(["COVER", "CONTAIN"]);

const empty = z.strictObject({});

// ---- Presentation presets: closed and code-defined (ADR-0013) ----

export const GRID_PRESETS = [
  "projectMeta",
  "projectStills",
  "projectLoop",
  "projectCredits",
  "homeIdentity",
  "homeAbout",
] as const;
export const GALLERY_PRESETS = ["homeWall"] as const;
export const IMAGE_PRESETS = ["projectCoda"] as const;

// ---- Per-type content and config ----

// The bounded title overlay (ADR-0010): a closed object with no authored text;
// the title resolves from projects.title.
const heroOverlaySchema = z
  .strictObject({
    enabled: z.boolean(),
    anchor: z.enum(["bottom-start"]),
    colStart: column,
    colSpan: column,
    showBackToWorks: z.boolean(),
  })
  .refine(spanFits, spanMessage);

const heroSchema = z.strictObject({
  type: z.literal("HERO"),
  content: z.strictObject({ caption: text(300).optional() }),
  config: z.strictObject({
    playback: playbackSchema.optional(),
    fit: fit.optional(),
    overlay: heroOverlaySchema.optional(),
  }),
});

// TEXT content is authored rich text, or derived from the owning project's
// fields and therefore authors nothing (ADR-0011).
export const textContentSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("richText"), paragraphs: z.array(paragraphSchema).min(1).max(50) }),
  z.strictObject({ kind: z.literal("projectFacts") }),
  z.strictObject({ kind: z.literal("projectCredits") }),
]);
export type TextContent = z.infer<typeof textContentSchema>;

// Typographic roles of the current identity, not type values.
export const TEXT_ROLES = ["display", "lead", "aside", "body", "statement", "caption", "more"] as const;

const textSchema = z.strictObject({
  type: z.literal("TEXT"),
  content: textContentSchema,
  config: z.strictObject({ role: z.enum(TEXT_ROLES).optional(), placement: placementSchema.optional() }),
});

const imageSchema = z.strictObject({
  type: z.literal("IMAGE"),
  content: z.strictObject({ caption: text(500).optional() }),
  config: z.strictObject({
    fit: fit.optional(),
    preset: z.enum(IMAGE_PRESETS).optional(),
    placement: placementSchema.optional(),
  }),
});

const videoSchema = z.strictObject({
  type: z.literal("VIDEO"),
  content: empty,
  config: z.strictObject({ playback: playbackSchema, fit: fit.optional(), placement: placementSchema.optional() }),
});

const gridSchema = z.strictObject({
  type: z.literal("GRID"),
  content: empty,
  config: z.strictObject({ preset: z.enum(GRID_PRESETS).optional() }),
});

const videoGridColumns = z
  .strictObject({ desktop: z.int().min(1).max(6), tablet: z.int().min(1).max(4), mobile: z.int().min(1).max(2) })
  .refine((c) => c.desktop >= c.tablet && c.tablet >= c.mobile, "column counts must not grow at narrower breakpoints");

export const galleryConfigSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("JUSTIFIED_ROWS") }),
  z.strictObject({ mode: z.literal("HORIZONTAL_STRIP") }),
  z.strictObject({ mode: z.literal("SLIDESHOW") }),
  z.strictObject({
    mode: z.literal("VIDEO_GRID"),
    columns: videoGridColumns,
    playback: multiItemPlaybackSchema,
    fit: fit.optional(),
    preset: z.enum(GALLERY_PRESETS).optional(),
  }),
]);

const gallerySchema = z.strictObject({
  type: z.literal("GALLERY"),
  content: z.strictObject({ label: text(200).optional() }),
  config: galleryConfigSchema,
});

const spacerSchema = z.strictObject({
  type: z.literal("SPACER"),
  content: empty,
  config: z.strictObject({ size: z.enum(["S", "M", "L"]) }),
});

export const blockDataSchema = z.discriminatedUnion("type", [
  heroSchema,
  textSchema,
  imageSchema,
  videoSchema,
  gridSchema,
  gallerySchema,
  spacerSchema,
]);
export type BlockData = z.infer<typeof blockDataSchema>;
export type BlockOf<T extends BlockType> = Extract<BlockData, { type: T }>;

// Per-placement presentation for one media item in a block.
export const blockMediaConfigSchema = z.strictObject({ playback: playbackSchema.optional(), fit: fit.optional() });
export type BlockMediaConfig = z.infer<typeof blockMediaConfigSchema>;

// ---- Validation in context ----

// Where a block sits decides some rules: derived text and the HERO overlay need
// a project owner, children must be leaves inside a GRID, and AUTOPLAY_AMBIENT
// is allowed only on a standalone surface (ADR-0008, ADR-0010).
export type BlockContext = {
  owner: "project" | "page";
  parentType: BlockType | null;
};

export class BlockValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid block: ${issues.join("; ")}`);
  }
}

const formatIssues = (error: z.ZodError) =>
  error.issues.map((issue) => `${issue.path.join(".") || "(block)"}: ${issue.message}`);

function contextIssues(block: BlockData, context: BlockContext): string[] {
  const issues: string[] = [];
  if (context.parentType !== null) {
    if (context.parentType !== "GRID") issues.push(`a ${context.parentType} cannot contain blocks`);
    if (!(LEAF_BLOCK_TYPES as readonly string[]).includes(block.type)) {
      issues.push(`a ${block.type} cannot be nested; GRID children are leaf blocks`);
    }
  }
  if (block.type === "HERO") {
    const { overlay, playback } = block.config;
    if (overlay?.enabled && context.owner !== "project") {
      issues.push("config.overlay: the title overlay is valid only on a project-owned HERO");
    }
    if (overlay?.enabled && playback && playback.mode !== "CLICK_TO_PLAY") {
      issues.push("config.overlay: the title overlay is valid only with CLICK_TO_PLAY playback");
    }
    if (playback?.mode === "AUTOPLAY_AMBIENT" && context.parentType !== null) {
      issues.push("config.playback: AUTOPLAY_AMBIENT is allowed only on a standalone surface");
    }
  }
  if (block.type === "VIDEO" && block.config.playback.mode === "AUTOPLAY_AMBIENT" && context.parentType !== null) {
    issues.push("config.playback: AUTOPLAY_AMBIENT is not allowed inside a GRID");
  }
  if (block.type === "TEXT" && block.content.kind !== "richText" && context.owner !== "project") {
    issues.push(`content.kind: ${block.content.kind} is derived from a project and needs a project owner`);
  }
  return issues;
}

export function parseBlock(input: unknown, context: BlockContext): BlockData {
  const result = blockDataSchema.safeParse(input);
  if (!result.success) throw new BlockValidationError(formatIssues(result.error));
  const issues = contextIssues(result.data, context);
  if (issues.length) throw new BlockValidationError(issues);
  return result.data;
}

// Per-item overrides follow the same container rule: no AUTOPLAY_AMBIENT on a
// gallery item or on media inside a GRID.
export function parseBlockMediaConfig(
  input: unknown,
  context: { blockType: BlockType; parentType: BlockType | null },
): BlockMediaConfig {
  const result = blockMediaConfigSchema.safeParse(input);
  if (!result.success) throw new BlockValidationError(formatIssues(result.error));
  if (
    result.data.playback?.mode === "AUTOPLAY_AMBIENT" &&
    (context.blockType === "GALLERY" || context.parentType !== null)
  ) {
    throw new BlockValidationError(["playback: AUTOPLAY_AMBIENT is not allowed on a multi-item surface"]);
  }
  return result.data;
}
