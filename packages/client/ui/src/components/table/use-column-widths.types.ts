/** A column key to the width in force for it, as a CSS length. */
export type ColumnWidths = Readonly<Record<string, string>>;

export interface UseColumnWidthsOptions {
  /**
   * Controlled: you hold the widths. Read by PRESENCE, not by value, so passing
   * `undefined` is controlled-and-empty rather than uncontrolled — the same
   * correction `useSortState`, `useRowSelection` and `useFilterState` each
   * needed, because "nothing resized" is a legal state and a consumer
   * round-tripping it through storage hands back nothing for it.
   */
  widths?: ColumnWidths;
  /** Uncontrolled seed — a restored layout, or a preset. */
  defaultWidths?: ColumnWidths;
  onWidthsChange?: (widths: ColumnWidths) => void;
}

export interface UseColumnWidthsResult {
  /** What is in force — the value a stored layout wants, unchanged. */
  state: ColumnWidths;
  /** Set the whole set at once — a restore, or a preset. */
  setWidths: (next: ColumnWidths) => void;
  /**
   * Back to the widths the columns declare. An ACTION beside `setWidths` rather
   * than a member of `props`, for the reason `clearFilters` is: `props` is one
   * component's bag, and spread onto `Table` this would reach the `<table>`
   * element as an unknown attribute.
   */
  resetWidths: () => void;
  /** Spread onto `Table` — the props it takes to draw the handles. */
  props: {
    columnWidths: ColumnWidths;
    onColumnResize: (key: string, width: string) => void;
  };
}
