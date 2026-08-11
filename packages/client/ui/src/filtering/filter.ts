import type { FilterState, RowFilter } from './filter.types.js';

/**
 * Matching text the way a reader expects, which is not the way `includes` does.
 *
 * THE PROBLEM THIS EXISTS FOR is the same one the collator exists for, one
 * operation over. A table that does not filter by itself makes every app write
 * `String(value).includes(query)`, and that comparison says "Àosta" does not
 * contain "aosta", "Straße" does not contain "strasse", and — in Turkish —
 * "İzmir" does not contain "izmir", because the dotted capital lowercases to a
 * letter the ASCII fold does not produce. Three defects, one per script, in
 * every codebase that renders a search box.
 *
 * PURE AND ISOMORPHIC — no React, no DOM, no state — so it is provable without
 * rendering anything, and so it can move to `packages/shared/` unchanged the
 * day the server has to answer the same question about the same rows. That day
 * is the first paginated filter: if the client and the server disagree about
 * what "contains" means, page 2 is not the continuation of page 1.
 */

/**
 * Fold a string to what a search should compare.
 *
 * CASE FIRST, IN THE READER'S LOCALE, then diacritics. The order matters and
 * the locale matters: `toLocaleLowerCase('tr')` maps `İ` to `i`, and the
 * default mapping does not — it produces `i̇`, an `i` with a combining dot,
 * which then survives as a different string. Doing the fold before the case
 * would strip that dot from the wrong side of the transformation.
 *
 * `\p{Diacritic}` rather than a hand-written class: the hand-written ones stop
 * at Latin, and a table of Greek or Vietnamese names is not an exotic case.
 */
export function foldForSearch(value: string, locale: string): string {
  return value
    .toLocaleLowerCase(locale)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** The columns actually filtered — an empty value is not a filter. */
export function activeFilters(filters: FilterState): string[] {
  return Object.keys(filters).filter((key) => filters[key]?.trim() !== '');
}

/** Is anything in force at all? */
export function isFiltered(filters: FilterState): boolean {
  return activeFilters(filters).length > 0;
}

/**
 * Does this row survive every filter in force?
 *
 * EVERY, not some: two filters narrow, they do not widen. A reader who has
 * asked for "Milano" and then for "Rossi" wants the rows that are both, and a
 * table that answered with the union would grow when they tried to shrink it.
 */
export function matchesFilters<T>(
  row: T,
  filters: FilterState,
  locale: string,
  own?: Partial<Record<string, RowFilter<T>>>,
): boolean {
  for (const key of activeFilters(filters)) {
    const value = filters[key] as string;
    const predicate = own?.[key];

    if (predicate) {
      if (!predicate(row, value)) return false;
      continue;
    }

    // A null row is what an API payload with a hole in it delivers, and it must
    // not take the table down from inside a predicate.
    const cell =
      row == null ? undefined : (row as Record<string, unknown>)[key];
    // NOTHING MATCHES NOTHING. An empty cell against a query the reader typed
    // is a row they did not ask for — and `String(undefined)` would make
    // "undefined" a searchable word, which is how a filter for "u" returns
    // every row with a hole in it.
    if (cell === null || cell === undefined || cell === '') return false;

    if (
      !foldForSearch(String(cell), locale).includes(
        foldForSearch(value.trim(), locale),
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * The rows that survive, without touching the caller's array.
 *
 * Returns the SAME array when nothing is in force, rather than a copy: an
 * unfiltered table should not hand React a new identity on every render, and
 * the caller's array is already the answer.
 */
export function filterRows<T>(
  rows: readonly T[],
  filters: FilterState,
  locale: string,
  own?: Partial<Record<string, RowFilter<T>>>,
): readonly T[] {
  if (!isFiltered(filters)) return rows;
  return rows.filter((row) => matchesFilters(row, filters, locale, own));
}
