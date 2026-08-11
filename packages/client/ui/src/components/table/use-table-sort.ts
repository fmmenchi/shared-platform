import { useMemo } from 'react';
import { UI_FALLBACK_LOCALE } from '../../i18n/messages.js';
import { useUiAdapters } from '../../i18n/provider.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { bySortBy, createCollator, sortRows } from '../../sorting/compare.js';
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
 * provider it falls back to `UI_FALLBACK_LOCALE` rather than throwing, because
 * a component that merely ASKS for a locale should not require one.
 *
 * THAT FALLBACK IS A FIXED TAG, NOT THE RUNTIME'S. Handing `undefined` to
 * `Intl.Collator` asks the HOST for its default, which is Node's ICU default on
 * the server and the browser's on the client — so the same rows are emitted in
 * one order and hydrated in another, and the symptom is row order, which is
 * about the hardest thing there is to attribute. This file's whole argument is
 * that client and server must collate identically; a host-dependent default is
 * the one input that guarantees they do not.
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

  const locale = useUiAdapters()?.i18n.locale ?? UI_FALLBACK_LOCALE;

  // The RAW locale, not the one message lookup resolves to. A German app whose
  // UI copy falls back to English still has to collate as German — the two
  // questions are different, and answering the second with the first is how a
  // table ends up ordering "Ärzte" as if it were English.
  const collator = useMemo(
    () => createCollator(locale, { numeric }),
    [locale, numeric],
  );

  // A KEY THAT NAMES NOTHING sorts nothing, silently, while the header claims
  // otherwise: `aria-sort` lands, the arrow turns, the live region announces a
  // reorder that did not happen. Two ordinary routes get here — a COMPUTED
  // column (`{ key: 'fullName', cell: … }`, whose key is not a property of the
  // row) marked sortable, and a typo in `compare`, which an index signature
  // cannot catch at compile time. Both leave every value `undefined`, which the
  // engine reads as empty on both sides and reports equal for every pair.
  // EVERY RANK IS ASKED, not just the first: a secondary column that names
  // nothing breaks ties with silence, which is even harder to see than a
  // primary that does — the rows move, just not for the reason the header
  // claims.
  const key = sort.state.find(
    (rung) =>
      !compare?.[rung.key] &&
      rows.length > 0 &&
      rows.every((row) => row == null || !(rung.key in (row as object))),
  )?.key;
  // `in`, NOT `Object.hasOwn`, and EVERY row, not the first few — the same two
  // corrections `useTableFilters` already records for the same probe: a row
  // that exposes its value through a prototype getter (a class instance, a
  // proxy) sorts perfectly well and was being warned about, and a property
  // that only appears from the sixth row on warned too. One question was being
  // answered two ways, and one of them had already been declared wrong in the
  // sibling file. `every` short-circuits on the first row that has the key, so
  // the full scan is only ever paid in the case that deserves the warning.
  useDevWarning(
    key !== undefined,
    `useTableSort: sorting by \`${String(key)}\`, which none of the rows has as a property and \`compare\` has no entry for — so the rows do not move while the header announces that they did. A computed column needs a \`compare\` entry; a key that looks right may be a typo.`,
  );

  const ordered = useMemo<readonly T[]>(() => {
    if (sort.state.length === 0) return rows;
    return sortRows(rows, bySortBy<T>(sort.state, collator, compare));
  }, [rows, sort.state, compare, collator]);

  return { rows: ordered, state: sort.state, props: sort.props };
}
