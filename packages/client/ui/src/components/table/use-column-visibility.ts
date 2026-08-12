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

  /**
   * The rule, asked of a GIVEN set — so the updater above and the menu below
   * cannot disagree about it, and neither has to read the render's closure.
   */
  const canHideIn = useCallback(
    (hiddenNow: HiddenColumns, key: string) => {
      if (hiddenNow.has(key)) return true;
      if (key === rowHeaderKey) return false;
      return columns.filter((column) => !hiddenNow.has(column.key)).length > 1;
    },
    [columns, rowHeaderKey],
  );

  const canHide = useCallback(
    (key: string) => {
      // BRINGING ONE BACK IS ALWAYS ALLOWED, and this line has to come first.
      // Asked after the row-header rule, it left a row header put away by
      // `defaultHidden` unable to return — permanently, silently, and with the
      // comment beside it claiming the opposite. Every row then announces as
      // "column 3, 47", which is the exact catastrophe the rule exists to
      // prevent, reached through the hook's own option.
      return canHideIn(state, key);
    },
    [canHideIn, state],
  );

  const setHidden = useCallback(
    (next: HiddenColumns) => {
      // A RESTORE IS THE HIGHEST-RISK CALLER, which is what this is for: a
      // layout saved before a column was renamed or before `rowHeader` moved.
      // Left unchecked it reaches exactly the two states the refusals exist to
      // prevent — every row announced as "column 3, 47", or a caption over an
      // empty grid — and `toggle` refusing them is no comfort when the restore
      // path walks straight past it.
      const keys = new Set(columns.map((column) => column.key));
      const kept = new Set(
        [...next].filter((key) => keys.has(key) && key !== rowHeaderKey),
      );

      // The floor, applied to the whole set at once: keep dropping the
      // last-added exceptions until something is left to look at.
      const order = columns.map((column) => column.key);
      for (let i = order.length - 1; kept.size >= order.length && i >= 0; i--) {
        kept.delete(order[i] as string);
      }

      setState(kept);
    },
    [columns, rowHeaderKey, setState],
  );

  const toggle = useCallback(
    (key: string) => {
      // THE UPDATER, like every sibling hook in this family — and for the
      // reason each of them records: two toggles dispatched in one tick both
      // read the same closure and the second overwrites the first. This menu
      // stays open on purpose, so "hide these three" is the ordinary gesture
      // rather than an exotic one.
      setState((previous) => {
        if (!canHideIn(previous, key)) return previous;
        const next = new Set(previous);
        if (!next.delete(key)) next.add(key);
        return next;
      });
    },
    [canHideIn, setState],
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
