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
