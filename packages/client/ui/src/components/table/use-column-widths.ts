import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import type {
  ColumnWidths,
  UseColumnWidthsOptions,
  UseColumnWidthsResult,
} from './use-column-widths.types.js';

/** Nothing resized. Shared, because an empty set has no identity worth having. */
const NO_WIDTHS: ColumnWidths = Object.freeze({});

/**
 * How wide each column is after the reader has had a say.
 *
 * A LAYOUT PARAMETER, and that is what separates it from the sort and the
 * filters. Those decide which rows exist, so they belong in a query key and in
 * a URL; this decides nothing about the data at all. It belongs in whatever
 * remembers a reader's preferences — `localStorage`, a profile — and putting it
 * in a query key would refetch the rows because somebody dragged a border.
 *
 * There is no second hook here, and there was no reason for one. Sorting and
 * filtering each split into "the state" and "the state plus the engine",
 * because a consumer whose server does the work should not carry the matcher.
 * Nothing computes a width: the browser measures it and the reader chooses it,
 * so the state is the whole hook.
 *
 * IT OVERRIDES `Column.width`, key by key, and a column with no entry keeps
 * whatever it declared. That is why a reset is a DELETE rather than a stored
 * value: "back to what the column asked for" is a fact the column already
 * holds, and copying it here would be a second copy to keep in step.
 */
export function useColumnWidths(
  options: UseColumnWidthsOptions = {},
): UseColumnWidthsResult {
  const { widths, defaultWidths, onWidthsChange } = options;

  const controlled = 'widths' in options;

  const [state, setState] = useControlled<ColumnWidths>({
    value: controlled ? (widths ?? NO_WIDTHS) : undefined,
    defaultValue: defaultWidths ?? NO_WIDTHS,
    onChange: onWidthsChange,
    name: 'useColumnWidths',
  });

  useDevWarning(
    controlled && !onWidthsChange,
    'useColumnWidths: `widths` is passed but `onWidthsChange` is not, so nothing can ever be resized and every handle is inert. Pass both, or pass `defaultWidths` and let the hook hold it.',
  );

  return {
    state,
    setWidths: (next) => setState(next),
    resetWidths: () => setState(NO_WIDTHS),
    props: {
      columnWidths: state,
      onColumnResize: (key, width) =>
        setState((previous) => {
          const next = { ...previous };
          // AN EMPTY WIDTH IS NOT A WIDTH OF ZERO — it is "no override", so the
          // key leaves and the column's own declaration applies again. The same
          // rule a cleared filter follows, and it matters for the same reason:
          // this object is persisted, and `{ city: '' }` and `{}` would be two
          // stored layouts describing one table.
          if (width === '') delete next[key];
          else next[key] = width;
          return next;
        }),
    },
  };
}
