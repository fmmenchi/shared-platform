/** The ids whose detail is open. */
export type ExpandedRows = ReadonlySet<string>;

export interface UseRowExpansionOptions {
  /**
   * Controlled: you hold which rows are open. Read by PRESENCE, not by value,
   * so passing `undefined` is controlled-and-empty rather than uncontrolled —
   * the correction each of the other state hooks needed, because "nothing
   * open" is a legal state.
   */
  expanded?: ExpandedRows;
  /** Uncontrolled seed — a row opened by a deep link, say. */
  defaultExpanded?: ExpandedRows;
  onExpandedChange?: (expanded: ExpandedRows) => void;
}

export interface UseRowExpansionResult {
  /** Which rows are open. */
  state: ExpandedRows;
  /** Open or close a set at once — a restore, or "collapse all". */
  setExpanded: (next: ExpandedRows) => void;
  /** Close everything. */
  collapseAll: () => void;
  /** Spread onto `Table`. */
  props: {
    expandedRows: ExpandedRows;
    onRowExpandToggle: (id: string) => void;
  };
}
