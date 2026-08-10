import { useCallback } from 'react';
import { useControlled } from '../../primitives/use-controlled.js';
import type { SortState } from '../../sorting/compare.types.js';
import type {
  UseSortStateOptions,
  UseSortStateResult,
} from './use-sort-state.types.js';

/**
 * Which column is ordered, and which way. The primitive under
 * `useTableSort` — state only, no engine.
 *
 * WHY THE PAIR LIVES HERE rather than on `Table`. A table has several
 * independent pieces of view state (this, selection, later the widths), and
 * giving each of them a `value`/`defaultValue`/`onChange` trio on the component
 * would be a dozen props. Each state gets its own hook instead, the hook owns
 * its pair, and `Table` receives values already resolved.
 *
 * IT DOES NOT SORT ANYTHING, and neither does `Table`. That is what dissolves
 * the knot the plan expected here: if a prop decided whether the component
 * reorders, it would be a prop that changes BEHAVIOUR, which this package
 * avoids. Reordering belongs to `useTableSort` or to the server; the component
 * only ever DISPLAYS the state — which arrow, what `aria-sort` says. There is
 * no "sorts twice" case because it does not sort once.
 *
 * So a consumer whose server does the ordering takes this hook, puts
 * `state` straight into their query key, and never pulls the collation engine
 * into their bundle.
 */
export function useSortState(
  options: UseSortStateOptions = {},
): UseSortStateResult {
  const { sort, defaultSort, defaultSortKey, onSortChange } = options;

  const seed =
    defaultSort ??
    (defaultSortKey
      ? { key: defaultSortKey, direction: 'asc' as const }
      : null);

  const [state, setState] = useControlled<SortState | null>({
    value: sort,
    defaultValue: seed,
    onChange: onSortChange,
    name: 'useSortState',
  });

  const change = useCallback(
    (next: SortState | null) => setState(next),
    [setState],
  );

  return {
    state: state ?? null,
    props: { sort: state ?? null, onSortChange: change },
  };
}

/**
 * Where a click on a header takes the sort.
 *
 * THREE STOPS, NOT TWO: ascending, descending, and back to none. The two-state
 * toggle is more common and is worse — once a reader has sorted a table there
 * is no way back to the order the data arrived in, which is the only order that
 * carries meaning in a table of events, a ranking, or anything the server chose
 * deliberately.
 *
 * Pure, and exported so the cycle can be proved without rendering a table.
 */
export function nextSort(
  current: SortState | null,
  key: string,
): SortState | null {
  if (current === null || current.key !== key) {
    return { key, direction: 'asc' };
  }
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return null;
}
