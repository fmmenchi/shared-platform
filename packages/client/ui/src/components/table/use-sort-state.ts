import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
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
 * THE CYCLE LIVES HERE TOO, and that was a correction. `Table` used to compute
 * the next stop from the `sort` prop it had been rendered with, which is state
 * logic in the one place that claims to hold none. The component now reports
 * the KEY the reader activated and the transition is computed here.
 *
 * Moving it was NOT by itself the fix for the stale read, and the first version
 * of this comment claimed it was. `setState(nextSort(state, key))` reads a
 * render value wherever it is written; what fixes it is the UPDATER, which lets
 * `useControlled` resolve against the last value it produced rather than the
 * last one it rendered. Uncontrolled that is now correct outright. Controlled,
 * the base can only be what the consumer last handed over — if they defer their
 * update they hold the stale value, not us — and reporting the key rather than
 * the next state is what leaves them somewhere to write `setSort((prev) =>
 * nextSort(prev, key))`.
 *
 * So a consumer whose server does the ordering takes this hook, puts
 * `state` straight into their query key, and never pulls the collation engine
 * into their bundle.
 */
export function useSortState(
  options: UseSortStateOptions = {},
): UseSortStateResult {
  const { sort, defaultSort, defaultSortKey, onSortChange } = options;

  // KEY PRESENCE, NOT VALUE, and the difference is a corrupted table. The state
  // this hook holds is nullable — `null` IS the third stop — so a consumer who
  // round-trips it through a URL naturally hands back `undefined` for "no sort".
  // Read as a value that would mean UNCONTROLLED, and `useControlled` then
  // serves the last uncontrolled value it happened to record: a fossil from
  // before the consumer took over. Measured, it announced "Sorted by Nome,
  // ascending" over rows in arrival order.
  const controlled = 'sort' in options;
  const seed =
    'defaultSort' in options
      ? defaultSort
      : defaultSortKey
        ? { key: defaultSortKey, direction: 'asc' as const }
        : null;

  const [state, setState] = useControlled<SortState | null>({
    value: controlled ? (sort ?? null) : undefined,
    defaultValue: seed ?? null,
    onChange: onSortChange,
    name: 'useSortState',
  });

  // Controlled and unwired is a table whose headers do nothing, forever — the
  // shape a consumer reaches when the state lives in a URL param and they pass
  // it in but forget the setter. `useControlled` cannot warn about it: it only
  // knows about FLIPPING between the two modes.
  useDevWarning(
    controlled && !onSortChange,
    'useSortState: `sort` is passed but `onSortChange` is not, so the state can never change and every header is inert. Pass both, or pass `defaultSort`/`defaultSortKey` and let the hook hold it.',
  );

  return {
    state: state ?? null,
    props: {
      sort: state ?? null,
      onSortToggle: (key: string) =>
        setState((previous) => nextSort(previous ?? null, key)),
    },
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
 * Pure, and PUBLIC, because `Table` reports the key rather than the next state:
 * a consumer holding the state themselves writes the cycle with this —
 * `onSortToggle={(key) => setSort((prev) => nextSort(prev, key))}` — and one
 * who wants a different cycle (descending first for dates and scores, or two
 * stops instead of three) writes their own function in the same place.
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
