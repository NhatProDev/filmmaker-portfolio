// JUSTIFIED_ROWS — the shared responsive system candidate (design-system.md
// §11.7): one expression and one set of constants for every page, with no
// per-page override. packJustifiedRows() is a verbatim port of pack() in the
// prototype that validated it (prototypes/responsive-system/Justified Rows
// Narrow Width v2.dc.html), which Home's responsive prototype consumes
// unchanged. Only the packing decision is ported; the prototype's whole-pixel
// rounding of cell boxes is not, because the browser sizes cells exactly (see
// JustifiedRows).

const GAP = 4;
const REF = 1.6;

export type RowHeight =
  | "justified" // the row fills the measure exactly
  | "target" // a ragged tail held at the target height
  | "ceil"; // a ragged row held at the height ceiling

export type Packing = {
  tiers: 1 | 2 | 3;
  rows: { items: number[]; height: RowHeight }[];
};

export function packJustifiedRows(aspects: readonly number[], measure: number): Packing {
  const tiers = measure >= 1024 ? 3 : measure >= 700 ? 2 : 1;
  const target = (measure - GAP * (tiers - 1)) / (tiers * REF);
  const floor = Math.max(120, 0.1 * measure);
  const ceil = 1.25 * measure;
  const solve = (items: number[], sum: number) => (measure - GAP * (items.length - 1)) / sum;
  const narrowest = (items: number[], sum: number) => {
    const h = solve(items, sum);
    return Math.min(...items.map((i) => aspects[i] * h));
  };

  // Pack in source order. Close a row when its solved height reaches the
  // target, or before an item that would push a cell below the floor.
  type Row = { items: number[]; sum: number; last?: boolean };
  const rows: Row[] = [];
  let row: number[] = [];
  let sum = 0;
  aspects.forEach((aspect, index) => {
    const nextItems = row.concat([index]);
    const nextSum = sum + aspect;
    if (row.length && narrowest(nextItems, nextSum) < floor) {
      rows.push({ items: row, sum });
      row = [index];
      sum = aspect;
    } else {
      row = nextItems;
      sum = nextSum;
    }
    if (solve(row, sum) <= target) {
      rows.push({ items: row, sum });
      row = [];
      sum = 0;
    }
  });
  if (row.length) rows.push({ items: row, sum, last: true });

  // Move a trailing item down while any row starves a cell. Boundaries move;
  // items are never swapped, promoted or deferred.
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.items.length < 2) continue;
      if (narrowest(r.items, r.sum) >= floor) continue;
      const m = r.items.pop()!;
      r.sum -= aspects[m];
      const next = rows[i + 1];
      if (next) {
        next.items.unshift(m);
        next.sum += aspects[m];
      } else {
        rows.push({ items: [m], sum: aspects[m], last: true });
      }
      moved = true;
    }
    if (!moved) break;
  }

  // A short lone tail joins the previous row only when that starves no cell.
  if (rows.length > 1) {
    const tail = rows[rows.length - 1];
    if (tail.last && tail.items.length === 1 && tail.sum * target < measure * 0.4) {
      const prev = rows[rows.length - 2];
      const merged = prev.items.concat(tail.items);
      const mergedSum = prev.sum + tail.sum;
      if (narrowest(merged, mergedSum) >= floor) {
        prev.items = merged;
        prev.sum = mergedSum;
        rows.pop();
      }
    }
  }

  return {
    tiers,
    rows: rows.map((r) => {
      let h = solve(r.items, r.sum);
      let height: RowHeight = "justified";
      if (r.last && h > target * 1.2) {
        h = target;
        height = "target";
      }
      if (h > ceil) {
        h = ceil;
        height = "ceil";
      }
      return { items: r.items, height };
    }),
  };
}

// The packing is a pure function of the aspects and the measure, and it is
// piecewise constant in the measure. Instead of running it in the browser, it
// is evaluated here across the measure range, and each stretch of identical
// packing becomes one container query. The browser then lays out any width
// exactly as the algorithm would, with no script and nothing to hydrate.
//
// Measures are sampled at every whole pixel in this range and each change is
// bisected to its exact boundary. Outside it the nearest packing extends.
const MIN_MEASURE = 240;
const MAX_MEASURE = 3840;

type Range = { from: number | null; to: number | null; packing: Packing };

function packingRanges(aspects: readonly number[]): Range[] {
  const key = (measure: number) => JSON.stringify(packJustifiedRows(aspects, measure));
  const ranges: Range[] = [{ from: null, to: null, packing: packJustifiedRows(aspects, MIN_MEASURE) }];
  let current = key(MIN_MEASURE);
  for (let measure = MIN_MEASURE + 1; measure <= MAX_MEASURE; measure++) {
    const next = key(measure);
    if (next === current) continue;
    let lo = measure - 1;
    let hi = measure;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (key(mid) === current) lo = mid;
      else hi = mid;
    }
    const boundary = Math.round(hi * 1000) / 1000;
    ranges[ranges.length - 1].to = boundary;
    ranges.push({ from: boundary, to: null, packing: packJustifiedRows(aspects, hi) });
    current = next;
  }
  return ranges;
}

const num = (value: number) => String(Math.round(value * 10000) / 10000);

// The height a ragged row is held at, in the container's own width units.
function heldHeight(height: RowHeight, tiers: number) {
  if (height === "ceil") return "125cqw";
  const gaps = GAP * (tiers - 1);
  const measure = gaps ? `(100cqw - ${gaps}px)` : "100cqw";
  return `${measure} / ${num(tiers * REF)}`;
}

// Container-query CSS for one gallery instance. The base styles in
// JustifiedRows.module.css put every item on its own justified row; each range
// below hides the breaks that are not row boundaries and fixes the width of
// cells in ragged rows. Justified cells need nothing: flex-grow in proportion
// to aspect over a zero basis sizes them exactly, and aspect-ratio gives the
// shared height.
export function justifiedRowsCss(scope: string, aspects: readonly number[]): string {
  let css = "";
  for (const { from, to, packing } of packingRanges(aspects)) {
    const hidden: string[] = [];
    const held: string[] = [];
    for (const row of packing.rows) {
      row.items.slice(1).forEach((item) => hidden.push(`${scope}>[data-break="${item}"]`));
      if (row.height === "justified") continue;
      const h = heldHeight(row.height, packing.tiers);
      row.items.forEach((item) =>
        held.push(`${scope}>[data-item="${item}"]{flex:0 0 calc(var(--aspect) * ${h})}`),
      );
    }
    const body = (hidden.length ? `${hidden.join(",")}{display:none}` : "") + held.join("");
    if (!body) continue;
    const query = [from !== null && `(width >= ${num(from)}px)`, to !== null && `(width < ${num(to)}px)`]
      .filter(Boolean)
      .join(" and ");
    css += query ? `@container justified-rows ${query}{${body}}` : body;
  }
  return css;
}
