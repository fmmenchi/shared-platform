import type { Comparator, SortDirection } from './compare.types.js';

/**
 * Ordering values the way a reader expects, which is not the way `<` does it.
 *
 * THE PROBLEM THIS EXISTS FOR. A table that does not sort by itself makes every
 * app write a comparator, and that comparator will be `a < b ? -1 : 1`. Which
 * puts "Zurigo" before "Àosta", because accented letters sit above `z` in code
 * point order; sorts `["10", "9"]` as `["10", "9"]`; and orders a column of
 * dates by their string form. Three defects, one per data type, in every
 * codebase that renders a table.
 *
 * Locale-aware ordering is ours to own for a reason that is not ambition: the
 * design system already HOLDS the locale, injected once into `UiProvider`. The
 * consumer would have to reach for it to do this correctly, so the thing they
 * would reach for should already have been done.
 *
 * PURE AND ISOMORPHIC on purpose — no React, no DOM, no state. It can be tested
 * without rendering anything, and the day the server has to order the same
 * column the same way, this moves to `packages/shared/` unchanged. That day is
 * coming: if the client and the server collate differently, page 2 is not the
 * continuation of page 1, and paginated results are quietly wrong.
 */

/**
 * `Intl.Collator` is expensive to construct and cheap to reuse, and a table
 * builds one per keystroke otherwise. Keyed by locale because that is the only
 * input; unbounded because an app has a handful of locales, not thousands.
 */
const collators = new Map<string, Intl.Collator>();

export function createCollator(locale?: string): Intl.Collator {
  const key = locale ?? '';
  const cached = collators.get(key);
  if (cached) return cached;

  const collator = new Intl.Collator(locale, {
    // "Item 2" before "Item 10". Without it the digits are compared as text and
    // 10 sorts above 9, which is the second most reported table bug after the
    // accents.
    numeric: true,
    // Case differences order adjacently rather than splitting the alphabet in
    // two, so "iPhone" sits next to "Iphone" instead of after every lowercase
    // word.
    sensitivity: 'variant',
  });
  collators.set(key, collator);
  return collator;
}

/**
 * Where a value with nothing in it goes. See `compareValues`.
 *
 * One of the three empties is not actually ours to place: `Array.prototype.sort`
 * moves `undefined` entries to the end BY SPECIFICATION, without ever calling
 * the comparator. Our rule agrees with the engine rather than fighting it, but
 * it does mean the order AMONG empties is not something this file can promise.
 */
const EMPTY_LAST = 1;

/**
 * Compare two cell values of unknown type.
 *
 * NOTHING SORTS LAST, IN BOTH DIRECTIONS, and that is a deliberate asymmetry
 * rather than an oversight. Treating `null` as "smaller than everything" is
 * what a naive comparator does, and it means reversing the column parades every
 * empty row to the top — where they are the least useful thing a reader could
 * be shown. Empty is not a value at one end of the range; it is the absence of
 * one, so it does not participate in the reversal.
 *
 * MIXED TYPES still have to answer. A column that is mostly numbers with a
 * "n/a" in it must not throw and must not produce a different order on every
 * run — `Array.prototype.sort` with an inconsistent comparator is allowed to do
 * anything. Ranking by type first gives a total order that is at least stable
 * and explicable.
 */
export function compareValues(
  a: unknown,
  b: unknown,
  collator: Intl.Collator,
): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return EMPTY_LAST;
  if (bEmpty) return -EMPTY_LAST;

  if (typeof a === 'number' && typeof b === 'number') {
    // NaN is empty-ish in a numeric column: it is not a position on the line.
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return EMPTY_LAST;
    if (Number.isNaN(b)) return -EMPTY_LAST;
    return a - b;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (typeof a === 'bigint' && typeof b === 'bigint') {
    // Subtraction would be a bigint, and `sort` wants a number.
    return a < b ? -1 : a > b ? 1 : 0;
  }

  return collator.compare(String(a), String(b));
}

/**
 * A comparator over rows, reading one key.
 *
 * The DIRECTION is applied here rather than by negating the result outside,
 * because negating outside would also flip the empty-last rule and send every
 * blank row to the top the moment the reader reverses the column.
 *
 * STABILITY IS THE SPEC'S. `Array.prototype.sort` has been required to be
 * stable since ES2019, so re-sorting an already-ordered list preserves the
 * previous order — which is what makes "sort by city, then by name" work by
 * clicking twice, with no multi-key machinery here.
 */
export function byKey<T>(
  key: string,
  direction: SortDirection,
  collator: Intl.Collator,
): Comparator<T> {
  const flip = direction === 'desc' ? -1 : 1;

  return (a, b) => {
    const left = (a as Record<string, unknown>)[key];
    const right = (b as Record<string, unknown>)[key];

    const aEmpty = left === null || left === undefined || left === '';
    const bEmpty = right === null || right === undefined || right === '';
    // Answered before the flip, so "nothing" stays at the bottom either way.
    if (aEmpty || bEmpty) return compareValues(left, right, collator);

    return flip * compareValues(left, right, collator);
  };
}

/**
 * Order rows, without touching the caller's array.
 *
 * A copy, always: sorting in place would reorder the array the consumer holds —
 * and with React that is a mutation of state they may be rendering from, which
 * shows up as a list that changes under a component that never re-rendered.
 */
export function sortRows<T>(rows: readonly T[], compare: Comparator<T>): T[] {
  return [...rows].sort(compare);
}
