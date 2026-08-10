import type { ControlledUpdater } from '../../primitives/use-controlled.js';
import type { Selection } from '../../selection/selection.types.js';

export interface UseRowSelectionOptions {
  /**
   * How many rows the result set has — NOT how many are on screen.
   *
   * It exists only so `count` can be answered under an `exclude` rule, and it
   * is optional because usually nobody on this side knows it. Passing the page
   * size here is the mistake this option was extracted to prevent: it turns
   * "everything except three of ten thousand" into "seventeen".
   */
  total?: number;
  /**
   * Controlled: you hold the selection. Read by PRESENCE, not by value, so
   * passing `undefined` is controlled-and-empty rather than uncontrolled — and
   * so the key must be present or absent for the component's lifetime. A
   * conditionally-spread `selection` changes the mode and drops the state.
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
   * client has never seen and no `total` was given to subtract from.
   *
   * `undefined` is a real answer, not a gap: under an `exclude` rule the count
   * belongs to whoever knows the result set's size. Rendering `0` there — or
   * the number of rows that happen to be loaded — is how a confirmation dialog
   * says "delete 3 records" before deleting ten thousand.
   */
  count: number | undefined;
  /**
   * Set the whole rule at once: clear after a bulk action, restore one from a
   * draft, or apply a range in a single edit.
   *
   * It takes React's updater form too, and that is the shape a range selection
   * wants — calling `onRowSelectToggle` in a loop is one intent per row, and
   * the intents are meant to be one per interaction.
   */
  setSelection: (next: ControlledUpdater<Selection>) => void;
  /** Spread onto `Table`. */
  props: {
    selection: Selection;
    /** A row's checkbox was activated. */
    onRowSelectToggle: (id: string) => void;
    /**
     * The header's checkbox was activated, for the ids the table RENDERED.
     *
     * They arrive as an argument rather than being remembered here, because the
     * rows on screen are the table's fact and keeping a second copy of it is
     * what let a header box speak for rows the reader could not see.
     */
    onSelectAllToggle: (ids: readonly string[]) => void;
  };
}
