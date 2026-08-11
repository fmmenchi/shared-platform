import { useMemo } from 'react';
import { UI_FALLBACK_LOCALE } from '../../i18n/messages.js';
import { useUiAdapters } from '../../i18n/provider.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { filterRows } from '../../filtering/filter.js';
import { useFilterState } from './use-filter-state.js';
import type {
  UseTableFiltersOptions,
  UseTableFiltersResult,
} from './use-table-filters.types.js';

/**
 * `useFilterState` plus the matching engine: the rows that survive.
 *
 * THE ROWS GO TO THE HOOK, NOT TO THE COMPONENT — the same shape sorting has,
 * and for the same reasons. `Table` never receives a data prop it could grow a
 * row model around, the memoisation lives here where the inputs are, and a
 * consumer whose server filters calls `useFilterState` instead, so the matching
 * is not in their bundle at all.
 *
 * THE LOCALE IS WHY THIS IS OURS. "Contains" is locale work: `includes` says
 * "Àosta" does not contain "aosta", and in Turkish it says "İzmir" does not
 * contain "izmir". A consumer writing their own filter writes `includes`, and
 * `includes` is wrong in a way nobody notices until the reader is Turkish.
 *
 * IT READS THE RAW LOCALE, not the one message lookup resolves to — the
 * opposite of the toolbar's number formatting, and deliberately. Case folding
 * is about the READER's language: a German app whose UI copy fell back to
 * English still has to fold as German. A number inside an English sentence has
 * to be written in English. Two different questions, two different answers.
 */
export function useTableFilters<T>(
  rows: readonly T[],
  options: UseTableFiltersOptions<T> = {},
): UseTableFiltersResult<T> {
  const { filter, ...stateOptions } = options;
  const filters = useFilterState(stateOptions);

  const locale = useUiAdapters()?.i18n.locale ?? UI_FALLBACK_LOCALE;

  // A KEY THAT NAMES NOTHING filters everything away, silently: the default
  // reads `row[key]`, finds `undefined` on every row, and treats an empty cell
  // as no match — so the table empties and the summary says it is filtered by
  // a column nobody can see. Two ordinary routes get here, a computed column
  // and a typo in `filter`, exactly as they do for `compare`.
  const orphan = filters.active.find(
    (key) =>
      !filter?.[key] &&
      rows.length > 0 &&
      // `in`, NOT `Object.hasOwn`: a row that exposes its value through a
      // prototype getter — a class instance, a proxy — filters perfectly well
      // and was being warned about. And every row rather than the first few,
      // because a property that only appears later warned too.
      rows.every((row) => row == null || !(key in (row as object))),
  );
  useDevWarning(
    orphan !== undefined,
    `useTableFilters: filtering by \`${String(orphan)}\`, which none of the rows has as a property and \`filter\` has no entry for — so every row is dropped and the table reads as empty. A computed column needs a \`filter\` entry; a key that looks right may be a typo.`,
  );

  const filtered = useMemo(
    () => filterRows(rows, filters.state, locale, filter),
    [rows, filters.state, locale, filter],
  );

  return {
    ...filters,
    rows: filtered,
    toolbarProps: {
      filters: filters.state,
      rowCount: filtered.length,
      onClearFilters: filters.clearFilters,
    },
  };
}
