import type { Column } from './table.types.js';

/** The keys of the columns the reader has put away. */
export type HiddenColumns = ReadonlySet<string>;

export interface UseColumnVisibilityOptions<T> {
  /**
   * Every column the table COULD show, in the order it would show them. The
   * hook hands back the subset that is visible; the menu needs the whole list,
   * because a column you cannot see is exactly the one you want to bring back.
   */
  columns: readonly Column<T>[];
  /**
   * Controlled: you hold which are hidden. Read by PRESENCE, not by value, so
   * passing `undefined` is controlled-and-empty rather than uncontrolled — the
   * same correction `useSortState`, `useRowSelection`, `useFilterState` and
   * `useColumnWidths` each needed, because "nothing hidden" is a legal state
   * and a consumer round-tripping it through storage hands back nothing for it.
   */
  hidden?: HiddenColumns;
  /** Uncontrolled seed — a restored layout, or a preset for a narrow screen. */
  defaultHidden?: HiddenColumns;
  onHiddenChange?: (hidden: HiddenColumns) => void;
}

export interface UseColumnVisibilityResult<T> {
  /**
   * The columns to render — pass them straight to `Table`.
   *
   * WHICH IS WHY THE TABLE NEEDS NO PROP FOR ANY OF THIS. It is handed fewer
   * columns and draws fewer columns; it never learns that one was put away, the
   * same way it never learns where the rows came from.
   */
  columns: readonly Column<T>[];
  /** What is in force — the value a stored layout wants, unchanged. */
  state: HiddenColumns;
  /** Whether this column is currently put away. */
  isHidden: (key: string) => boolean;
  /**
   * Whether this column may be put away AT ALL. Two columns may not, and both
   * refusals are about what the table would become without them — see the hook.
   */
  canHide: (key: string) => boolean;
  /** Put one away, or bring it back. A refused column is a no-op. */
  toggle: (key: string) => void;
  /** Set the whole set at once — a restore, or a preset. */
  setHidden: (next: HiddenColumns) => void;
  /** Show everything again. */
  showAll: () => void;
  /**
   * Spread onto `TableColumnsMenu` — everything it needs to draw the list and
   * nothing it does not.
   */
  menuProps: {
    columns: readonly Column<T>[];
    hidden: HiddenColumns;
    canHide: (key: string) => boolean;
    onToggle: (key: string) => void;
  };
}
