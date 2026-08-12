import { useCallback, useMemo } from 'react';
import { useControlled } from '../../primitives/use-controlled.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import type {
  ColumnOrder,
  UseColumnOrderOptions,
  UseColumnOrderResult,
} from './use-column-order.types.js';

/** As declared. Shared, because an empty list has no identity worth having. */
const DECLARED: ColumnOrder = Object.freeze([]);

/**
 * One column moved, and the rest closing up behind it. Pure, and PUBLIC for the
 * same reason `nextSort` is: a consumer holding the order themselves writes the
 * move with this rather than re-deriving it.
 *
 * CLAMPED RATHER THAN WRAPPED. A column at the first position asked to go
 * earlier stays put: wrapping would send it to the end, which is a different
 * thing from what the reader asked and, on a repeat key, an infinite ride.
 *
 * A key the order does not contain is returned untouched. The alternative —
 * appending it — would invent a position for a column that may simply have been
 * renamed.
 */
export function moveColumn(
  order: ColumnOrder,
  key: string,
  delta: number,
): ColumnOrder {
  const from = order.indexOf(key);
  if (from === -1) return order;

  const to = from + delta;
  if (to < 0 || to >= order.length) return order;

  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, key);
  return next;
}

/**
 * The order the reader has put the columns in.
 *
 * A LAYOUT PARAMETER, like the widths and what is hidden, and unlike the sort
 * and the filters: it decides nothing about which rows exist, so it belongs
 * wherever a reader's preferences live rather than in a query key.
 *
 * THE STATE IS KEYS, NOT COLUMNS. A column is a render description — a `cell`
 * function, a comparator's name, a width — and none of that survives a trip
 * through `localStorage`. Keys do, and the declared list stays the one place
 * that says what a column IS.
 *
 * IT COMPOSES WITH VISIBILITY RATHER THAN KNOWING ABOUT IT:
 *
 *     const order = useColumnOrder({ columns });
 *     const visibility = useColumnVisibility({ columns: order.columns });
 *     <Table columns={visibility.columns} … />
 *
 * so the menu lists every column in the order in force, and the table is handed
 * the ones that are left. Neither hook learns about the other.
 *
 * A KEY THE COLUMNS NO LONGER HAVE IS DROPPED, and one they have gained is
 * appended in its declared place — a stored order outlives a release, and the
 * alternative is a column that exists and is never drawn.
 */
export function useColumnOrder<T>(
  options: UseColumnOrderOptions<T>,
): UseColumnOrderResult<T> {
  const { columns, order, defaultOrder, onOrderChange } = options;

  const controlled = 'order' in options;

  const [state, setState] = useControlled<ColumnOrder>({
    value: controlled ? (order ?? DECLARED) : undefined,
    defaultValue: defaultOrder ?? DECLARED,
    onChange: onOrderChange,
    name: 'useColumnOrder',
  });

  useDevWarning(
    controlled && !onOrderChange,
    'useColumnOrder: `order` is passed but `onOrderChange` is not, so nothing can ever be moved and every move is inert. Pass both, or pass `defaultOrder` and let the hook hold it.',
  );

  /**
   * The order actually in force: the stored one, minus keys that have gone,
   * plus keys it never knew about, each in its declared place.
   */
  const keys = useMemo(() => {
    const declared = columns.map((column) => column.key);
    if (state.length === 0) return declared;

    const known = new Set(declared);
    const kept = state.filter((key) => known.has(key));
    const seen = new Set(kept);

    // A column the stored order predates goes where it was DECLARED, not at the
    // end: one added between two others reads as belonging there, and appending
    // would put it after columns the author meant it to precede. Its place is
    // found from the nearest declared predecessor that the stored order still
    // knows about.
    const merged = [...kept];
    for (const key of declared) {
      if (seen.has(key)) continue;

      let insertAt = 0;
      for (let i = declared.indexOf(key) - 1; i >= 0; i -= 1) {
        const at = merged.indexOf(declared[i] as string);
        if (at !== -1) {
          insertAt = at + 1;
          break;
        }
      }
      merged.splice(insertAt, 0, key);
      seen.add(key);
    }

    return merged;
  }, [columns, state]);

  const ordered = useMemo(() => {
    const byKey = new Map(columns.map((column) => [column.key, column]));
    return keys
      .map((key) => byKey.get(key))
      .filter(
        (column): column is (typeof columns)[number] => column !== undefined,
      );
  }, [columns, keys]);

  const canMove = useCallback(
    (key: string, delta: number) => {
      const from = keys.indexOf(key);
      if (from === -1) return false;
      const to = from + delta;
      return to >= 0 && to < keys.length && delta !== 0;
    },
    [keys],
  );

  const move = useCallback(
    (key: string, delta: number) => {
      // THE UPDATER, like every sibling: two moves in one tick both read the
      // same closure otherwise, and a reader holding the key down produces
      // exactly that.
      setState((previous) =>
        moveColumn(previous.length === 0 ? keys : previous, key, delta),
      );
    },
    [keys, setState],
  );

  const positionOf = useCallback(
    (key: string) => keys.indexOf(key) + 1,
    [keys],
  );

  const setOrder = useCallback(
    (next: ColumnOrder) => setState(next),
    [setState],
  );

  const reset = useCallback(() => setState(DECLARED), [setState]);

  const menuProps = useMemo(
    () => ({ canMove, onMove: move, positionOf }),
    [canMove, move, positionOf],
  );

  return {
    columns: ordered,
    state: keys,
    move,
    canMove,
    positionOf,
    setOrder,
    reset,
    menuProps,
  };
}
