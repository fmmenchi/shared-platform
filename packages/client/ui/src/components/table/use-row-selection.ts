import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import {
  EVERYTHING_SELECTED,
  NOTHING_SELECTED,
  countSelected,
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
 * IT IS NOT GIVEN THE ROWS, and that was a correction. It used to take them, to
 * work out what "select all" meant — which put the rendered rows in two places,
 * the hook's copy and the table's, with nothing tying them together. The
 * paginated consumer is the one who gets hurt: hook over the whole result set
 * (because selection outlives a page), `Table` over a slice, and one click on a
 * header box that showed three rows selected six. `getRowId` was asked for
 * twice for the same reason, and two answers that disagree produced a rule full
 * of ids nothing matched, silently. So `Table` now reports WHICH ids its header
 * box spoke for, and there is one source of that fact: the rows on screen.
 *
 * IT REPORTS INTENTS, NOT STATES, for the reason `useSortState` does: `Table`
 * says "this row's box was activated" or "the header's was, for these ids", and
 * the transition is computed here. The updater form is load-bearing rather than
 * stylistic — two toggles fired in one tick used to compute from the same
 * render value, and the first one silently vanished.
 */
export function useRowSelection(
  options: UseRowSelectionOptions = {},
): UseRowSelectionResult {
  const { total, selection, defaultSelection, onSelectionChange } = options;

  // Key presence, not value — the same correction `useSortState` needed. There
  // is no `null` state here, but "controlled and empty" and "uncontrolled" are
  // still two different things, and a consumer clearing a selection naturally
  // hands back whatever their store considers empty. Present or absent for the
  // component's lifetime: a conditionally-spread `selection` flips the mode and
  // drops the state, which `useControlled` warns about after the fact.
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

  return {
    state,
    // `total` IS THE RESULT SET'S, not the page's, and passing the page was the
    // defect: under an `exclude` rule it made `count` the number of rows that
    // happen to be loaded — the exact value the engine documents as the one
    // that must never be returned. Omitted, `count` is `undefined`, which is
    // the honest answer when only the server knows.
    count: countSelected(state, total),
    setSelection: (next) => setState(next),
    // The bar's half of the pairing, spread the way `props` is spread onto
    // `Table`. The two escalations are named rather than left to the consumer
    // to assemble from the exported constants: reaching for
    // `EVERYTHING_SELECTED` by hand was the trap, not the concept.
    //
    // It carries `total` and NOT `count`. Handing over both let the bar's
    // label and its effect come from different numbers — measured, an offer
    // reading "Select all 7" that selected 2,450 — so the bar derives the one
    // from the other.
    toolbarProps: {
      selection: state,
      total,
      onSelectEverything: () => setState(EVERYTHING_SELECTED),
      onClear: () => setState(NOTHING_SELECTED),
    },
    props: {
      selection: state,
      onRowSelectToggle: (id) => setState((prev) => toggleRow(prev, id)),
      onSelectAllToggle: (ids) => setState((prev) => toggleRows(prev, ids)),
    },
  };
}
