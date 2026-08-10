import { useMemo } from 'react';
import { useUiAdapters } from '../../i18n/provider.js';
import { byKey, createCollator, sortRows } from '../../sorting/compare.js';
import { useSortState } from './use-sort-state.js';
import type {
  UseTableSortOptions,
  UseTableSortResult,
} from './use-table-sort.types.js';

/**
 * `useSortState` plus the collation engine: the rows, in order.
 *
 * THE ROWS GO TO THE HOOK, NOT TO THE COMPONENT, and that is what keeps the
 * whole design honest. `Table` never receives a data prop it could grow a row
 * model around, the memoisation lives here where the inputs are, and a consumer
 * whose server sorts simply calls `useSortState` instead — the engine is then
 * not in their bundle at all.
 *
 * THE LOCALE IS THE REASON THIS IS OURS. Sorting text correctly is locale work
 * — "Àosta" before "Zurigo" — and the design system already holds the locale.
 * A consumer writing their own comparator reaches for `<`, and `<` puts every
 * accented word after `z`. Read tolerantly, like `useDirection`: outside a
 * provider it falls back to the runtime default rather than throwing, because a
 * component that merely ASKS for a locale should not require one.
 *
 * A COLUMN THE DEFAULT CANNOT KNOW passes its own comparator. `priority` is not
 * alphabetical, and no design system can guess that it goes low → medium →
 * high. That is the one place domain enters, and it is one place.
 */
export function useTableSort<T>(
  rows: readonly T[],
  options: UseTableSortOptions<T> = {},
): UseTableSortResult<T> {
  const { compare, numeric, ...stateOptions } = options;
  const sort = useSortState(stateOptions);

  const locale = useUiAdapters()?.i18n.locale;

  // The RAW locale, not the one message lookup resolves to. A German app whose
  // UI copy falls back to English still has to collate as German — the two
  // questions are different, and answering the second with the first is how a
  // table ends up ordering "Ärzte" as if it were English.
  const collator = useMemo(
    () => createCollator(locale, { numeric }),
    [locale, numeric],
  );

  const ordered = useMemo(() => {
    if (sort.state === null) return rows as T[];

    const own = compare?.[sort.state.key];
    if (own) {
      // The consumer's comparator describes the ASCENDING order; the direction
      // is ours to apply, so they never write it twice.
      const flip = sort.state.direction === 'desc' ? -1 : 1;
      return sortRows(rows, (a, b) => flip * own(a, b));
    }

    return sortRows(
      rows,
      byKey<T>(sort.state.key, sort.state.direction, collator),
    );
  }, [rows, sort.state, compare, collator]);

  return { rows: ordered, state: sort.state, props: sort.props };
}
