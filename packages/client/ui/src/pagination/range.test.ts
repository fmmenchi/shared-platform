import { describe, it, expect } from 'vitest';
import { pageRange, pageCountOf } from './range.js';
import type { PageItem } from './range.types.js';

/**
 * The range, tested WITHOUT a component — because the property that matters is
 * arithmetic and a rendered pager exercises the one page its fixture happened
 * to be on.
 */
const show = (items: PageItem[]) =>
  items
    .map((item) => (item.kind === 'page' ? String(item.page) : '…'))
    .join(' ');

describe('pageRange', () => {
  it('draws every page when they all fit', () => {
    expect(show(pageRange(1, 5))).toBe('1 2 3 4 5');
    expect(show(pageRange(3, 7))).toBe('1 2 3 4 5 6 7');
  });

  it('keeps the first and the last within reach from anywhere', () => {
    // "Back to the beginning" and "how many are there" are the two questions a
    // pager answers that a Next button does not.
    for (const page of [1, 5, 20, 40]) {
      const items = pageRange(page, 40);
      expect(items.at(0)).toEqual({ kind: 'page', page: 1 });
      expect(items.at(-1)).toEqual({ kind: 'page', page: 40 });
    }
  });

  it('keeps the same number of controls at every page', () => {
    // THE PROPERTY THE USUAL IMPLEMENTATION GETS WRONG: a list that grows and
    // shrinks moves the Next button under the pointer between clicks and
    // changes a keyboard reader's tab count on every press.
    const widths = new Set(
      Array.from({ length: 40 }, (_, index) => pageRange(index + 1, 40).length),
    );
    expect(widths.size).toBe(1);
  });

  it('opens the end that has no gap', () => {
    // With no gap on the left the list would come up one control short, so the
    // run on that side is lengthened to match.
    expect(show(pageRange(1, 40))).toBe('1 2 3 4 5 … 40');
    expect(show(pageRange(3, 40))).toBe('1 2 3 4 5 … 40');
    expect(show(pageRange(40, 40))).toBe('1 … 36 37 38 39 40');
  });

  it('gaps both sides in the middle', () => {
    expect(show(pageRange(20, 40))).toBe('1 … 19 20 21 … 40');
  });

  it('widens with `siblingCount`, and stays constant at the new width', () => {
    expect(show(pageRange(20, 40, { siblingCount: 2 }))).toBe(
      '1 … 18 19 20 21 22 … 40',
    );
    const widths = new Set(
      Array.from(
        { length: 40 },
        (_, index) => pageRange(index + 1, 40, { siblingCount: 2 }).length,
      ),
    );
    expect(widths.size).toBe(1);
  });

  it('survives a page outside the range', () => {
    // A page restored from a URL after the data shrank, which is the ordinary
    // way this happens.
    expect(show(pageRange(0, 5))).toBe('1 2 3 4 5');
    expect(show(pageRange(99, 5))).toBe('1 2 3 4 5');
    expect(show(pageRange(99, 40))).toBe('1 … 36 37 38 39 40');
  });

  it('never spends a slot hiding one page', () => {
    // `1 … 3 4 5 … 40` hides page 2 ALONE: the ellipsis costs the same slot the
    // page would have, and page 2 costs an extra click. Measured before the
    // fix: 106 of the first sixty page counts did this at the default sibling
    // count, and no test could see it.
    for (let siblingCount = 0; siblingCount <= 3; siblingCount += 1) {
      for (let pageCount = 1; pageCount <= 60; pageCount += 1) {
        for (let page = 1; page <= pageCount; page += 1) {
          const items = pageRange(page, pageCount, { siblingCount });
          items.forEach((item, index) => {
            if (item.kind !== 'gap') return;
            const before = items[index - 1];
            const after = items[index + 1];
            if (before?.kind !== 'page' || after?.kind !== 'page') return;
            expect(
              after.page - before.page,
              `gap between ${before.page} and ${after.page} at page ${page} of ${pageCount} (siblingCount ${siblingCount})`,
            ).toBeGreaterThan(2);
          });
        }
      }
    }
  });

  it('holds every promise it makes, at every page of every size', () => {
    // A SWEEP, because the arithmetic is the product. Two mutations of the
    // window survived the eleven cases written by hand — one drew an ellipsis
    // for zero pages, the other changed the width — and neither is reachable
    // without varying `pageCount` around the boundary.
    for (const siblingCount of [0, 1, 2, 3, 5]) {
      const widths = new Map<number, number>();
      for (let pageCount = 1; pageCount <= 60; pageCount += 1) {
        for (let page = -2; page <= pageCount + 2; page += 1) {
          const items = pageRange(page, pageCount, { siblingCount });
          const pages = items
            .filter((item) => item.kind === 'page')
            .map((item) => (item as { page: number }).page);
          const where = `page ${page} of ${pageCount}, siblingCount ${siblingCount}`;

          expect(new Set(pages).size, `duplicates at ${where}`).toBe(
            pages.length,
          );
          expect(
            pages.every((n, index) => index === 0 || n > pages[index - 1]!),
            `out of order at ${where}`,
          ).toBe(true);
          expect(
            pages.every((n) => Number.isInteger(n) && n >= 1 && n <= pageCount),
            `out of range at ${where}`,
          ).toBe(true);
          expect(pages.at(0), `first missing at ${where}`).toBe(1);
          expect(pages.at(-1), `last missing at ${where}`).toBe(pageCount);

          const clamped = Math.min(Math.max(Math.round(page), 1), pageCount);
          expect(
            pages.includes(clamped),
            `current page ${clamped} missing at ${where}`,
          ).toBe(true);

          const seen = widths.get(pageCount);
          if (seen === undefined) widths.set(pageCount, items.length);
          else expect(items.length, `width moved at ${where}`).toBe(seen);
        }
      }
    }
  });

  it('is not broken by a number that is not one', () => {
    // `defaultPage: parseInt(params.get('page') ?? '', 10)` is the shape the
    // hook's own doc names, and it is `NaN` for a missing parameter. Unguarded,
    // that produced a range with no current page at all — and a `NaN` sibling
    // count produced one with no page 1, because `Array.from({length: NaN})` is
    // empty.
    expect(show(pageRange(Number.NaN, 40))).toBe('1 2 3 4 5 … 40');
    expect(show(pageRange(5, Number.NaN))).toBe('');
    // Falls back to the documented default of 1, which at page 5 is
    // `1 … 4 5 6 … 40` — the start gap hides pages 2 and 3, so it earns its
    // slot.
    expect(show(pageRange(5, 40, { siblingCount: Number.NaN }))).toBe(
      '1 … 4 5 6 … 40',
    );
    // A NUMBER THAT IS NOT A COUNT becomes the smallest one that is. Negative
    // dropped the current page and drew two ellipses in a row; fractional
    // produced a control called "Page 4.5". Both now floor to no siblings,
    // which is the narrowest pager that still answers every question.
    expect(show(pageRange(5, 10, { siblingCount: -1 }))).toBe('1 … 5 … 10');
    expect(show(pageRange(5, 10, { siblingCount: 0.5 }))).toBe('1 … 5 … 10');
  });

  it('has nothing to draw for no pages', () => {
    expect(pageRange(1, 0)).toEqual([]);
  });
});

describe('pageCountOf', () => {
  it('counts the pages a total makes', () => {
    expect(pageCountOf(100, 20)).toBe(5);
    expect(pageCountOf(101, 20)).toBe(6);
    expect(pageCountOf(1, 20)).toBe(1);
  });

  it('says ZERO for no rows, not one', () => {
    // "Page 1 of 1" over an empty table contradicts the empty message beside
    // it; the pager renders nothing at all instead.
    expect(pageCountOf(0, 20)).toBe(0);
  });

  it('refuses to divide by a page size of nothing', () => {
    expect(pageCountOf(100, 0)).toBe(0);
    expect(pageCountOf(100, -5)).toBe(0);
  });
});
