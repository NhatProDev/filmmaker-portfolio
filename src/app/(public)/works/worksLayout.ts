import { measureRanges, packJustifiedRows, rangeCondition } from "@/components/media/justifiedRowsLayout";

// ART-WORKS-SPECIFIC sheet structure (page-specifications.md §2.9), measured
// against the sheet's own width, which is full bleed:
//
//   >= 1171     locked count-aware desktop packer   ·  desktop index
//   700–1170    JUSTIFIED_ROWS, verbatim            ·  per-row index  (T 3 at >= 1024, T 2 below)
//   540–699     Art Works pairs                     ·  per-row index
//   < 540       JUSTIFIED_ROWS, verbatim, T = 1     ·  per-row index  (one frame per row)
//
// 1171 and 540 are Art Works evidence, not global breakpoints. The index
// structure switches at the same width as the packer (works.module.css).
export const DESKTOP_TAKEOVER = 1171;
const PAIRS_FROM = 540;
const PAIRS_TO = 700;
const GAP = 4;
// The plate numeral and its 120 × 62 corner scrim.
const PLATE_MIN = 120;

// One packed row. Units in a justified row need no rule: flex-grow in
// proportion to aspect over a zero basis sizes them exactly, and the frame's
// aspect-ratio gives the shared height. A ragged row carries its unit width as
// a CSS expression, in percent of the sheet and the unit's own --ar.
type SheetRow = { items: number[]; width: string | null };

const num = (value: number) => String(Math.round(value * 10000) / 10000);

// The locked desktop packer (art-works-2c-v2.md §3), a verbatim port of
// packLocked(): a count-dependent target height, no floor, and an
// unconditional orphan merge under 40% of the measure.
function lockedRows(aspects: readonly number[], measure: number): SheetRow[] {
  const n = aspects.length;
  let target = 300;
  if (n <= 4) target = 420;
  else if (n >= 16) target = 250;

  type Row = { items: number[]; sum: number; last?: boolean };
  const rows: Row[] = [];
  let row: number[] = [];
  let sum = 0;
  aspects.forEach((aspect, index) => {
    row.push(index);
    sum += aspect;
    if ((measure - GAP * (row.length - 1)) / sum <= target) {
      rows.push({ items: row, sum });
      row = [];
      sum = 0;
    }
  });
  if (row.length) rows.push({ items: row, sum, last: true });
  if (rows.length > 1) {
    const tail = rows[rows.length - 1];
    if (tail.last && tail.sum * target < measure * 0.4) {
      const prev = rows[rows.length - 2];
      prev.items = prev.items.concat(tail.items);
      prev.sum += tail.sum;
      rows.pop();
    }
  }

  return rows.map((r) => {
    const h = (measure - GAP * (r.items.length - 1)) / r.sum;
    const ragged = r.last && h > target * 1.2;
    return { items: r.items, width: ragged ? `calc(var(--ar) * ${target}px)` : null };
  });
}

// Art Works pairs, a port of pairs() for the accepted variant: consecutive
// projects share one row height, h = (W − 4) / (ar₁ + ar₂), widths from native
// aspect, no crop and no portrait special case. A lone last item keeps the
// previous row's height and grows only as far as the plate minimum requires.
// The structure does not depend on the measure.
function pairRows(aspects: readonly number[]): SheetRow[] {
  const rows: SheetRow[] = [];
  let pairSum = 0;
  for (let i = 0; i < aspects.length; i += 2) {
    if (i + 1 < aspects.length) {
      rows.push({ items: [i, i + 1], width: null });
      pairSum = aspects[i] + aspects[i + 1];
    } else {
      // With no previous row the prototype takes a 2:1 partner's height.
      const sum = rows.length ? pairSum : aspects[i] + 2;
      rows.push({
        items: [i],
        width: `max(calc(var(--ar) * (100% - ${GAP}px) / ${num(sum)}), ${PLATE_MIN}px)`,
      });
    }
  }
  return rows;
}

// JUSTIFIED_ROWS, the shared candidate, unchanged. Ragged rows are held at the
// target or the ceiling height.
function sharedRows(aspects: readonly number[], measure: number): SheetRow[] {
  const { tiers, rows } = packJustifiedRows(aspects, measure);
  const gaps = GAP * (tiers - 1);
  const target = `${gaps ? `(100% - ${gaps}px)` : "100%"} / ${num(tiers * 1.6)}`;
  return rows.map((r) => ({
    items: r.items,
    width:
      r.height === "justified" ? null : r.height === "ceil" ? "calc(var(--ar) * 125%)" : `calc(var(--ar) * ${target})`,
  }));
}

export function sheetRowsAt(aspects: readonly number[], measure: number): SheetRow[] {
  if (measure >= DESKTOP_TAKEOVER) return lockedRows(aspects, measure);
  if (measure >= PAIRS_FROM && measure < PAIRS_TO) return pairRows(aspects);
  return sharedRows(aspects, measure);
}

// Container-query CSS for the sheet. The base styles put every unit on its own
// row; each range hides the breaks that are not row boundaries and fixes the
// width of units in ragged rows. Evaluated on the server, so every width lays
// out from the first paint with no script.
export function sheetCss(scope: string, aspects: readonly number[]): string {
  let css = "";
  for (const range of measureRanges((measure) => sheetRowsAt(aspects, measure))) {
    const hidden: string[] = [];
    const held: string[] = [];
    for (const row of range.layout) {
      row.items.slice(1).forEach((item) => hidden.push(`${scope}>[data-break="${item}"]`));
      const width = row.width;
      if (width) row.items.forEach((item) => held.push(`${scope}>[data-unit="${item}"]{flex:0 0 ${width}}`));
    }
    const body = (hidden.length ? `${hidden.join(",")}{display:none}` : "") + held.join("");
    if (!body) continue;
    const query = rangeCondition(range);
    css += query ? `@container works-sheet ${query}{${body}}` : body;
  }
  return css;
}

// Desktop index columns follow the project count (art-works-2c-v2.md §3).
export function indexColumns(count: number): 1 | 2 | 3 {
  return count <= 4 ? 1 : count <= 12 ? 2 : 3;
}
