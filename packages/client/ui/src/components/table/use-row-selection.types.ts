import type {
  Selection,
  SelectionCoverage,
} from '../../selection/selection.types.js';

export interface UseRowSelectionOptions<T> {
  /**
   * The row's identity — the same function `Table` receives, and for the same
   * reason: selection survives a re-sort, a refetch and a page change only if
   * the rows are named by something that survives them too.
   */
  getRowId: (row: T) => string;
  /**
   * Controlled: you hold the selection. Read by PRESENCE, not by value, so
   * passing `undefined` is controlled-and-empty rather than uncontrolled.
   */
  selection?: Selection;
  /** Uncontrolled seed. Defaults to nothing selected. */
  defaultSelection?: Selection;
  onSelectionChange?: (selection: Selection) => void;
}

export interface UseRowSelectionResult {
  /** The rule, as it stands — what a bulk action's request body wants. */
  state: Selection;
  /**
   * How many rows are selected, or `undefined` when the rule covers rows this
   * client has never seen and no total was available to subtract from.
   *
   * `undefined` is a real answer, not a gap: under an `exclude` rule the count
   * belongs to whoever knows the result set's size. Rendering `0` there is how
   * a confirmation dialog says "delete 3 records" before deleting ten thousand.
   */
  count: number | undefined;
  /**
   * How much of what is on screen is picked — `Table` uses it for the header
   * box's three states, and it is exposed because composed mode has to draw
   * that box itself.
   */
  coverage: SelectionCoverage;
  /** Spread onto `Table`. */
  props: {
    selection: Selection;
    /** A row's checkbox was activated. */
    onRowSelectToggle: (id: string) => void;
    /** The header's checkbox was activated — it speaks for the rendered rows. */
    onSelectAllToggle: () => void;
  };
}
