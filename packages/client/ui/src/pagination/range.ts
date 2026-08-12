import type { PageItem, PageRangeOptions } from './range.types.js';

/**
 * Which page numbers to draw, and where the gaps go.
 *
 * PURE, AND SEPARATE FROM THE COMPONENT, because this is the part that is
 * wrong everywhere. The usual implementation slices an array and produces a
 * list whose LENGTH changes as the reader pages through — five controls, then
 * seven, then five — so the "next" button moves under the pointer between
 * clicks and a keyboard reader's tab count changes on every press. This one
 * keeps the count fixed for a given `siblingCount`, which is why the ends
 * expand: at page 1 there is no gap on the left, so the pages that gap would
 * have hidden are drawn instead.
 *
 * THE FIRST AND LAST PAGE ARE ALWAYS THERE. "Back to the beginning" and "how
 * many are there" are the two questions a pager answers that a Next button
 * does not, and both are one control away at every point in the range.
 */
export function pageRange(
  page: number,
  pageCount: number,
  options: PageRangeOptions = {},
): PageItem[] {
  // BOTH INPUTS ARE PUBLIC NUMBERS, and neither can be trusted. `siblingCount`
  // is a prop with a Storybook control on it, and `page` is documented as
  // arriving from a URL — where `parseInt(params.get('page') ?? '')` is `NaN`
  // for a missing one. Measured, unguarded: `NaN` sibling count dropped page 1
  // out of the range entirely (`Array.from({length: NaN})` is `[]`), a negative
  // one dropped the CURRENT page and drew two ellipses in a row, and a
  // fractional one produced a control called "Page 4.5".
  const { siblingCount = 1 } = options;
  const siblings = Number.isFinite(siblingCount)
    ? Math.max(0, Math.trunc(siblingCount))
    : 1;

  if (!Number.isFinite(pageCount) || pageCount <= 0) return [];

  const wanted = Number.isFinite(page) ? Math.round(page) : 1;
  const current = Math.min(Math.max(wanted, 1), pageCount);

  // The widest the list ever gets: first, last, the current one, its siblings
  // on both sides, and the two gaps. Below this everything fits and no gap is
  // needed at all.
  const window = siblings * 2 + 5;
  if (pageCount <= window) {
    return Array.from({ length: pageCount }, (_, index) => ({
      kind: 'page' as const,
      page: index + 1,
    }));
  }

  // A GAP HAS TO HIDE AT LEAST TWO PAGES TO BE WORTH ITS SLOT. Drawn as soon
  // as it hid ONE, the ellipsis stood in for a single page — `1 … 3 4 5 … 40`
  // hides only page 2 — so that page cost an extra click while the list was no
  // shorter than drawing it would have been. Measured: 106 page counts in the
  // first sixty do this at the default sibling count. The list keeps its length
  // either way, because the branch below draws a page where the gap was.
  const startGap = current - siblings > 3;
  const endGap = current + siblings < pageCount - 2;

  // WHAT THE MISSING GAP BUYS BACK. With no gap on one side the list would come
  // up one control short, so the run on that side is lengthened to match — this
  // is what keeps the count constant, and the arithmetic is worth stating
  // rather than tuning until it looks right.
  const runLength = siblings * 2 + 3;

  if (!startGap) {
    return [
      ...Array.from({ length: runLength }, (_, index) => ({
        kind: 'page' as const,
        page: index + 1,
      })),
      { kind: 'gap' as const, side: 'end' as const },
      { kind: 'page' as const, page: pageCount },
    ];
  }

  if (!endGap) {
    return [
      { kind: 'page' as const, page: 1 },
      { kind: 'gap' as const, side: 'start' as const },
      ...Array.from({ length: runLength }, (_, index) => ({
        kind: 'page' as const,
        page: pageCount - runLength + 1 + index,
      })),
    ];
  }

  return [
    { kind: 'page', page: 1 },
    { kind: 'gap', side: 'start' },
    ...Array.from({ length: siblings * 2 + 1 }, (_, index) => ({
      kind: 'page' as const,
      page: current - siblings + index,
    })),
    { kind: 'gap', side: 'end' },
    { kind: 'page', page: pageCount },
  ];
}

/**
 * How many pages a total makes. Zero rows is ZERO pages, not one: "page 1 of 1"
 * over an empty table is a sentence that contradicts the empty message beside
 * it, and the pager renders nothing at all instead.
 */
export function pageCountOf(total: number, pageSize: number): number {
  // NEITHER IS TRUSTED. A total arrives from a response and a size from a
  // control; `NaN` through here reached the clamp downstream and defeated it,
  // leaving both step controls enabled on a list with no current page.
  if (!Number.isFinite(total) || !Number.isFinite(pageSize)) return 0;
  if (pageSize <= 0 || total <= 0) return 0;
  return Math.ceil(total / pageSize);
}
