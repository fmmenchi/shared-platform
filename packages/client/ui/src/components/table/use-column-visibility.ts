import { useCallback, useMemo } from 'react';
import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import type {
  HiddenColumns,
  UseColumnVisibilityOptions,
  UseColumnVisibilityResult,
} from './use-column-visibility.types.js';

/** Nothing hidden. Shared, because an empty set has no identity worth having. */
const NONE: HiddenColumns = Object.freeze(new Set<string>());

/**
 * Which columns the reader has put away.
 *
 * A LAYOUT PARAMETER, like the widths and unlike the sort and the filters.
 * Those decide which ROWS exist, so they belong in a query key and in a URL;
 * this decides nothing about the data at all. It belongs wherever a reader's
 * preferences live, and putting it in a query key would refetch every row
 * because somebody unticked a column.
 *
 * THERE IS NO SECOND HOOK, and no prop on `Table`. Sorting and filtering each
 * split into "the state" and "the state plus the engine", because a consumer
 * whose server does the work should not carry the matcher. Hiding has no engine
 * to carry: the hook hands back fewer columns and the table draws fewer
 * columns. It never learns that one was put away — the same silence it keeps
 * about where the rows came from.
 *
 * TWO COLUMNS REFUSE TO GO, and both refusals are about what the table would
 * become without them:
 *
 *   - THE ROW HEADER. It is what names each row; a screen reader reading a cell
 *     announces the row by it. Hide it and every row becomes "column 3, 47" —
 *     the table still renders, and stops being navigable by anyone not looking
 *     at it. This is the whole reason `rowHeader` exists, so the hook will not
 *     let a menu undo it.
 *   - THE LAST ONE STANDING. Hiding everything leaves a caption over an empty
 *     grid, which reads as a broken table rather than a chosen one. The floor
 *     is one, and it is checked against what is visible NOW rather than against
 *     the column list, because that is the question being asked.
 *
 * A refusal is a NO-OP rather than a throw: the menu draws those entries
 * disabled, so the only way to reach this path is a programmatic `toggle`, and
 * taking down an app over a column is not proportionate. `canHide` is exported
 * so the menu can say so before the reader tries.
 */
export function useColumnVisibility<T>(
  options: UseColumnVisibilityOptions<T>,
): UseColumnVisibilityResult<T> {
  const { columns, hidden, defaultHidden, onHiddenChange } = options;

  const controlled = 'hidden' in options;

  const [state, setState] = useControlled<HiddenColumns>({
    value: controlled ? (hidden ?? NONE) : undefined,
    defaultValue: defaultHidden ?? NONE,
    onChange: onHiddenChange,
    name: 'useColumnVisibility',
  });

  useDevWarning(
    controlled && !onHiddenChange,
    'useColumnVisibility: `hidden` is passed but `onHiddenChange` is not, so nothing can ever be shown or put away and every entry in the menu is inert. Pass both, or pass `defaultHidden` and let the hook hold it.',
  );

  const rowHeaderKey = useMemo(
    () => columns.find((column) => column.rowHeader)?.key,
    [columns],
  );

  const visible = useMemo(
    () => columns.filter((column) => !state.has(column.key)),
    [columns, state],
  );

  const isHidden = useCallback((key: string) => state.has(key), [state]);

  const canHide = useCallback(
    (key: string) => {
      if (key === rowHeaderKey) return false;
      // Bringing one BACK is always allowed; only taking the last one away is
      // refused, so the floor is asked about the direction being travelled.
      if (state.has(key)) return true;
      return visible.length > 1;
    },
    [rowHeaderKey, state, visible.length],
  );

  const setHidden = useCallback(
    (next: HiddenColumns) => setState(next),
    [setState],
  );

  const toggle = useCallback(
    (key: string) => {
      if (!canHide(key)) return;
      const next = new Set(state);
      if (!next.delete(key)) next.add(key);
      setState(next);
    },
    [canHide, state, setState],
  );

  const showAll = useCallback(() => setState(NONE), [setState]);

  const menuProps = useMemo(
    () => ({ columns, hidden: state, canHide, onToggle: toggle }),
    [columns, state, canHide, toggle],
  );

  return {
    columns: visible,
    state,
    isHidden,
    canHide,
    toggle,
    setHidden,
    showAll,
    menuProps,
  };
}
