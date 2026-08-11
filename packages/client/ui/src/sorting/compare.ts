import type { Comparator, SortBy, SortDirection } from './compare.types.js';

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
 * design system already HOLDS the locale, injected once into `UiProvider`.
 *
 * PURE AND ISOMORPHIC — no React, no DOM, no state — so it is provable without
 * rendering anything, and so it can move to `packages/shared/` unchanged the
 * day the server has to order the same column the same way. That day is coming:
 * if the client and the server collate differently, page 2 is not the
 * continuation of page 1, and paginated results are quietly wrong.
 *
 * A COMPARATOR MUST BE A TOTAL ORDER, and that requirement drives every choice
 * below. `Array.prototype.sort` given an inconsistent comparator is permitted
 * to produce anything at all, so "mostly right" is not a weaker version of
 * right — it is output that depends on the order the rows happened to arrive
 * in. The first version of this file was inconsistent, and the measurement is
 * worth keeping: a column of `[-10, -5, '-7', -1, '-3']` produced THIRTEEN
 * different orderings across its 120 input permutations. The cause was a
 * `String()` fallback for mixed types meeting `numeric: true`, which collates
 * "-10" by magnitude and ignores the sign, while same-type numbers went through
 * subtraction, which does not. Two branches disagreeing is all it takes.
 */

/** How many collators to keep. See `createCollator`. */
const MAX_CACHED_COLLATORS = 50;

const collators = new Map<string, Intl.Collator>();

/**
 * A collator, reused.
 *
 * `Intl.Collator` is expensive to construct and cheap to reuse, and a table
 * would build one per keystroke otherwise.
 *
 * THE TAG IS CANONICALISED, because `de-DE`, `de-de` and `DE-de` are one locale
 * and three cache keys otherwise — and because `en_US`, the form that arrives
 * from a Java or POSIX backend, makes the constructor THROW. Uncaught inside a
 * comparator, that is an exception mid-render; here it falls back to the
 * runtime default instead.
 *
 * AND THE CACHE IS CAPPED. The header above commits this file to a long-lived
 * Node process, where the locale can come from `Accept-Language` — which is to
 * say from the request. `de-DE-u-co-phonebk-x-a…` are all valid, all distinct,
 * and an unbounded map keyed on request input is unbounded growth keyed on
 * request input.
 */
export function createCollator(
  locale?: string,
  options: { numeric?: boolean } = {},
): Intl.Collator {
  const numeric = options.numeric ?? true;

  let tag: string | undefined;
  try {
    tag =
      locale === undefined ? undefined : Intl.getCanonicalLocales(locale)[0];
  } catch {
    tag = undefined;
  }

  const key = `${tag ?? ''}|${numeric}`;
  const cached = collators.get(key);
  if (cached) return cached;

  const collator = new Intl.Collator(tag, {
    // "Item 2" before "Item 10". Without it the digits are compared as text and
    // 10 sorts above 9, which is the second most reported table bug after the
    // accents — for LABELS. It is the wrong answer for identifiers, codes and
    // money ("$1,000" reads as 1), which is why it is a parameter rather than a
    // fact about the collator, and why two distinct strings are never allowed
    // to compare equal below.
    numeric,
  });

  // OLDEST OUT, one at a time. Emptying the map instead is a cache that stops
  // working under exactly the load it was capped for: a process serving more
  // than `MAX_CACHED_COLLATORS` distinct `Accept-Language` tags would flush
  // every entry, including the handful it is about to need again. A `Map`
  // iterates in insertion order, so its first key is the oldest.
  if (collators.size >= MAX_CACHED_COLLATORS) {
    const oldest = collators.keys().next().value;
    if (oldest !== undefined) collators.delete(oldest);
  }
  collators.set(key, collator);
  return collator;
}

/** Where a value with nothing in it goes. See `compareValues`. */
const EMPTY_LAST = 1;

/**
 * Nothing, in every shape a real payload delivers it.
 *
 * ONE PREDICATE, called from both places that need it. The first version asked
 * the question twice with two different answers — `compareValues` counted `NaN`
 * as empty and `byKey` did not — so a `NaN` escaped the empty-last rule, got
 * multiplied by the descending flip, and arrived at the TOP of the column. Two
 * definitions of the same word is the defect; deleting one removes the class.
 *
 * An invalid `Date` belongs here for the same reason it is dangerous elsewhere:
 * its `getTime()` is `NaN`, so a subtraction against it returns `NaN`, which the
 * sort specification coerces to `+0` — "equal to every date". Equality that is
 * not transitive corrupts the order of the VALID dates around it.
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'number') return Number.isNaN(value);
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return false;
}

/**
 * Which family a value belongs to, so that two families never meet in a text
 * comparison.
 *
 * This is the "rank by type" the first version's comment described and its code
 * did not have. Without it a `Date` against a string is collated by
 * `"Thu Jan 01 2026 19:00:00 GMT-0500 (Peru Standard Time)"` — ordered by the
 * weekday name, and different on a server in UTC than in a browser in Lima,
 * which is precisely the client/server divergence this file exists to prevent.
 */
function rank(value: unknown): number {
  if (typeof value === 'number' || typeof value === 'bigint') return 0;
  if (value instanceof Date) return 1;
  if (typeof value === 'boolean') return 2;
  return 3;
}

/** Relational rather than arithmetic — see `compareValues`. */
function order(a: number | bigint, b: number | bigint): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Compare two cell values of unknown type.
 *
 * NOTHING SORTS LAST, IN BOTH DIRECTIONS, and that is a deliberate asymmetry.
 * Treating "empty" as "smaller than everything" is what a naive comparator
 * does, and it means reversing the column parades every empty row to the top —
 * where they are the least useful thing a reader could be shown. Empty is not a
 * value at one end of the range; it is the absence of one, so it does not take
 * part in the reversal.
 *
 * SUBTRACTION IS NEVER USED, though it is the obvious way to compare numbers.
 * `Infinity - Infinity` is `NaN`, and a `NaN` result is a comparator saying "I
 * cannot answer" — which `sort` silently reads as "equal", and which any other
 * caller reads as a broken return type. The relational form answers `0` there,
 * gets `-0` right, and compares a `bigint` against a `number` EXACTLY, with no
 * precision lost to a `Number()` coercion.
 */
export function compareValues(
  a: unknown,
  b: unknown,
  collator: Intl.Collator,
): number {
  const aEmpty = isEmpty(a);
  const bEmpty = isEmpty(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return EMPTY_LAST;
  if (bEmpty) return -EMPTY_LAST;

  const rankA = rank(a);
  const rankB = rank(b);
  if (rankA !== rankB) return rankA - rankB;

  if (rankA === 0) return order(a as number, b as number);
  if (rankA === 1) return order((a as Date).getTime(), (b as Date).getTime());
  if (rankA === 2) return Number(a) - Number(b);

  const left = String(a);
  const right = String(b);
  const collated = collator.compare(left, right);
  // TWO DISTINCT STRINGS MUST NEVER REPORT EQUAL. With `numeric` on, "007" and
  // "7" collate identically — and a comparator that calls unequal values equal
  // is not a total order, so a column of ids would interleave them by whatever
  // arrival order the rows happened to have. The code-unit comparison is the
  // tiebreak, so the reader still gets numeric-aware ordering and the engine
  // still gets a total order.
  return collated !== 0 ? collated : order2(left, right);
}

/** The same shape as `order`, for strings. */
function order2(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * A comparator over rows, reading one key.
 *
 * The DIRECTION is applied here rather than by negating the result outside,
 * because negating outside would also flip the empty-last rule and send every
 * blank row to the top the moment the reader reverses the column.
 *
 * STABILITY IS THE SPEC'S. `Array.prototype.sort` has been required to be
 * stable since ES2019, so re-sorting an ALREADY-ORDERED list preserves the
 * previous order for rows that tie on the new key.
 *
 * Which is a property of this function and NOT a feature of the table: to chain
 * "by city, then by name" a caller has to feed the output of one sort into the
 * next, and `useTableSort` always sorts its INPUT array — the rows as the
 * consumer handed them over. Two clicks there give the second sort, not both.
 * Multi-key ordering is a `SortState[]`, and that is a decision deferred, not a
 * technique already available.
 */
export function byKey<T>(
  key: string,
  direction: SortDirection,
  collator: Intl.Collator,
): Comparator<T> {
  const flip = direction === 'desc' ? -1 : 1;

  return (a, b) => {
    // A null row is what an API payload with a hole in it delivers, and it must
    // not take the table down from inside a comparator.
    const left = a == null ? undefined : (a as Record<string, unknown>)[key];
    const right = b == null ? undefined : (b as Record<string, unknown>)[key];

    // Answered before the flip, and with the SAME predicate `compareValues`
    // uses, so "nothing" stays at the bottom either way.
    if (isEmpty(left) || isEmpty(right)) {
      return compareValues(left, right, collator);
    }

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
/**
 * One comparator for the whole order: each entry decides, and hands the pair to
 * the next only when it cannot tell them apart.
 *
 * TIES ARE THE POINT. A single-key sort leaves rows in whatever order the
 * previous pass left them — stable, but arbitrary to the reader, who sees two
 * people of the same age in an order nothing on screen explains. Naming the
 * next column is how that stops being luck.
 *
 * A CONSUMER'S COMPARATOR STILL DESCRIBES THE ASCENDING ORDER, at every rank,
 * so the direction is applied here and they never write it twice — the same
 * bargain `byKey` makes and the reason the two are built the same way.
 */
export function bySortBy<T>(
  sort: SortBy,
  collator: Intl.Collator,
  custom?: Partial<Readonly<Record<string, Comparator<T>>>>,
): Comparator<T> {
  const rungs = sort.map(({ key, direction }) => {
    const own = custom?.[key];
    if (!own) return byKey<T>(key, direction, collator);

    const flip = direction === 'desc' ? -1 : 1;
    return (a: T, b: T) => flip * own(a, b);
  });

  return (a, b) => {
    for (const rung of rungs) {
      const verdict = rung(a, b);
      if (verdict !== 0) return verdict;
    }
    return 0;
  };
}

export function sortRows<T>(rows: readonly T[], compare: Comparator<T>): T[] {
  return [...rows].sort(compare);
}
