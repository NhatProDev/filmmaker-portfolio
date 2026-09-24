import { paragraphSchema, type InlineRun, type Paragraph } from "./block.schema";

// The Studio's editing notation for rich text (Phase 3B). Stored content is
// never this notation: it is the block contract's inline runs (plain text,
// emphasis, link), and this module converts between the two for one textarea.
//
//   *words*            emphasis
//   [words](href)      a link: a site path, an https URL or a mailto address
//   \*  \[  \]  \\     the literal character
//   a blank line       a new paragraph
//
// Nothing else is recognised: no HTML, no nesting, no other Markdown. Anything
// that does not parse is refused with its reason, never guessed at.

export type MarkupResult = { ok: true; paragraphs: Paragraph[] } | { ok: false; error: string };

const escape = (text: string) => text.replace(/[\\*[\]]/g, (c) => `\\${c}`);

export function paragraphsToMarkup(paragraphs: readonly Paragraph[]): string {
  return paragraphs
    .map((paragraph) =>
      paragraph
        .map((run) => {
          if (typeof run === "string") return escape(run);
          if ("em" in run) return `*${escape(run.em)}*`;
          return `[${escape(run.link.text)}](${run.link.href})`;
        })
        .join(""),
    )
    .join("\n\n");
}

function parseParagraph(source: string, number: number): Paragraph | string {
  const runs: InlineRun[] = [];
  let plain = "";
  const flush = () => {
    if (plain) runs.push(plain);
    plain = "";
  };
  const where = `Paragraph ${number}`;
  let i = 0;
  // Reads escaped text up to one of `stops`; returns null at the end.
  const readUntil = (stops: string): { text: string; stop: string } | null => {
    let text = "";
    while (i < source.length) {
      const c = source[i];
      if (c === "\\" && i + 1 < source.length) {
        text += source[i + 1];
        i += 2;
        continue;
      }
      if (stops.includes(c)) {
        i += 1;
        return { text, stop: c };
      }
      text += c;
      i += 1;
    }
    return null;
  };

  while (i < source.length) {
    const c = source[i];
    if (c === "\\" && i + 1 < source.length) {
      plain += source[i + 1];
      i += 2;
    } else if (c === "*") {
      i += 1;
      const inner = readUntil("*[");
      if (!inner || inner.stop !== "*") return `${where}: emphasis opened with * needs a closing * (links cannot sit inside emphasis).`;
      if (!inner.text.trim()) return `${where}: emphasis is empty.`;
      flush();
      runs.push({ em: inner.text });
    } else if (c === "[") {
      i += 1;
      const text = readUntil("]*");
      if (!text || text.stop !== "]") return `${where}: a link's words need a closing ] (emphasis cannot sit inside a link).`;
      if (source[i] !== "(") return `${where}: after [${text.text}] write the destination in brackets, like (https://…).`;
      // The destination runs to the ) that balances its (, so an address
      // with brackets of its own survives a round trip.
      let close = -1;
      for (let j = i + 1, depth = 0; j < source.length; j += 1) {
        if (source[j] === "(") depth += 1;
        else if (source[j] === ")" && depth-- === 0) {
          close = j;
          break;
        }
      }
      if (close < 0) return `${where}: a link destination needs a closing ).`;
      const href = source.slice(i + 1, close).trim();
      i = close + 1;
      if (!text.text.trim()) return `${where}: a link needs words to show.`;
      flush();
      runs.push({ link: { href, text: text.text } });
    } else if (c === "]") {
      return `${where}: a ] without its [. Write \\] for the character itself.`;
    } else {
      plain += c;
      i += 1;
    }
  }
  flush();
  const checked = paragraphSchema.safeParse(runs);
  if (!checked.success) {
    const issue = checked.error.issues[0];
    if (issue.path.includes("href")) return `${where}: a link must go to a site path (/works), an https:// address or a mailto: address.`;
    return `${where}: ${issue.message}`;
  }
  return checked.data;
}

export function markupToParagraphs(markup: string): MarkupResult {
  const sources = markup
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!sources.length) return { ok: false, error: "Text cannot be empty." };
  if (sources.length > 50) return { ok: false, error: "At most 50 paragraphs." };
  const paragraphs: Paragraph[] = [];
  for (const [index, source] of sources.entries()) {
    const parsed = parseParagraph(source, index + 1);
    if (typeof parsed === "string") return { ok: false, error: parsed };
    paragraphs.push(parsed);
  }
  return { ok: true, paragraphs };
}
