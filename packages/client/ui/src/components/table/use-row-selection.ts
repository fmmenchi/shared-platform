import { useMemo } from 'react';
import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import {
  NOTHING_SELECTED,
  countSelected,
  coverageOf,
  toggleRow,
  toggleRows,
} from '../../selection/selection.js';
import type { Selection } from '../../selection/selection.types.js';
import type {
  UseRowSelectionOptions,
  UseRowSelectionResult,
} from './use-row-selection.types.js';

/**
 * Which rows the reader picked, and the two intents that change it.
 *
 * SELECTION IS NOT A PROJECTION PARAMETER, and that is why it is a hook of its
 * own rather than another field on the sort state. Sorting and filtering DERIVE
 * the rows; selection is downstream of them and derives nothing — it is an
 * interaction that ends in an action, so it belongs in a bulk operation's
 * request body, not in a query key. Modelling the two the same way is how a
 * table ends up refetching because somebody ticked a box.
 *
 * WHAT IT OWES THE ROWS is exactly one thing: identity. Selection has to
 * survive a re-sort, a refetch and a page change, and an index cannot do that —
 * which is why `getRowId` was already required by `Table` before this existed.
 * Nothing else about the rows matters here, so nothing else is read.
 *
 * IT REPORTS INTENTS, NOT STATES, for the reason `useSortState` does: `Table`
 * says "this row's box was activated" or "the header's was", and the transition
 * is computed here against the state this hook owns. A component computing the
 * next selection from the prop it was rendered with reads a value that a
 * deferred update has not refreshed — with a set, that is a lost tick rather
 * than a wrong arrow.
 */
export function useRowSelection<T>(
  rows: readonly T[],
  options: UseRowSelectionOptions<T>,
): UseRowSelectionResult {
  const { getRowId, selection, defaultSelection, onSelectionChange } = options;

  // Key presence, not value — the same correction `useSortState` needed. There
  // is no `null` state here, but "controlled and empty" and "uncontrolled" are
  // still two different things, and a consumer clearing a selection naturally
  // hands back whatever their store considers empty.
  const controlled = 'selection' in options;

  const [state, setState] = useControlled<Selection>({
    value: controlled ? (selection ?? NOTHING_SELECTED) : undefined,
    defaultValue: defaultSelection ?? NOTHING_SELECTED,
    onChange: onSelectionChange,
    name: 'useRowSelection',
  });

  useDevWarning(
    controlled && !onSelectionChange,
    'useRowSelection: `selection` is passed but `onSelectionChange` is not, so nothing can ever be selected and every checkbox is inert. Pass both, or pass `defaultSelection` and let the hook hold it.',
  );

  // The ids of the rows IN HAND. The header checkbox can only ever speak for
  // these: on a paginated table "select all" over rows the client never
  // received is a different affordance, and one only the consumer can offer,
  // because only they know whether there are more.
  const ids = useMemo(() => rows.map(getRowId), [rows, getRowId]);

  return {
    state,
    count: countSelected(state, rows.length),
    coverage: coverageOf(state, ids),
    props: {
      selection: state,
      onRowSelectToggle: (id: string) => setState(toggleRow(state, id)),
      onSelectAllToggle: () => setState(toggleRows(state, ids)),
    },
  };
}
