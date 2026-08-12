import type { Column } from './table.types.js';

/** The column keys, in the order they are shown. */
export type ColumnOrder = readonly string[];

export interface UseColumnOrderOptions<T> {
  /**
   * The columns as DECLARED. The order in force is expressed as keys, so this
   * stays the source of what each column is and the state stays a small thing
   * a consumer can put in storage.
   */
  columns: readonly Column<T>[];
  /**
   * Controlled: you hold the order. Read by PRESENCE, not by value — an empty
   * list is a legal state ("as declared") and a consumer round-tripping it
   * through storage hands back nothing for it, the correction every hook in
   * this family has needed.
   */
  order?: ColumnOrder;
  /** Uncontrolled seed — a restored layout. */
  defaultOrder?: ColumnOrder;
  onOrderChange?: (order: ColumnOrder) => void;
}

export interface UseColumnOrderResult<T> {
  /**
   * The columns in the order in force — pass them on to `useColumnVisibility`,
   * or straight to `Table` if nothing is hidden.
   */
  columns: readonly Column<T>[];
  /** The keys in force. Empty means "as declared". */
  state: ColumnOrder;
  /** Move one column earlier (`-1`) or later (`+1`). Refused moves are no-ops. */
  move: (key: string, delta: number) => void;
  /** Whether that move would go anywhere — false at the ends. */
  canMove: (key: string, delta: number) => boolean;
  /** Where a column sits now, counting from 1, for a sentence about it. */
  positionOf: (key: string) => number;
  /** Set the whole order at once — a restore, or a preset. */
  setOrder: (next: ColumnOrder) => void;
  /** Back to the order the columns were declared in. */
  reset: () => void;
  /** Spread onto `TableColumnsMenu`, beside the visibility hook's own props. */
  menuProps: {
    canMove: (key: string, delta: number) => boolean;
    onMove: (key: string, delta: number) => void;
    positionOf: (key: string) => number;
  };
}
