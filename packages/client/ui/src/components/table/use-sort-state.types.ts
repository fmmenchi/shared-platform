import type { SortState } from '../../sorting/compare.types.js';

export interface UseSortStateOptions {
  /**
   * Controlled: you hold the state, and the table only displays it.
   *
   * Read by PRESENCE, not by value — passing `sort={undefined}` is controlled
   * and unsorted, not uncontrolled — because `null` is a legal state here and a
   * consumer round-tripping it through a URL hands back `undefined` for it.
   */
  sort?: SortState | null;
  /** Uncontrolled seed. `null` is honoured: it is not "not passed". */
  defaultSort?: SortState | null;
  /** Shorthand for `defaultSort: { key, direction: 'asc' }`. */
  defaultSortKey?: string;
  onSortChange?: (sort: SortState | null) => void;
}

export interface UseSortStateResult {
  /** The current state — the value a query key wants, unchanged. */
  state: SortState | null;
  /** Spread onto `Table`. */
  props: {
    sort: SortState | null;
    /**
     * Receives the KEY the reader activated, never the resulting state: the
     * cycle is computed here, against the state this hook owns, so `Table`
     * holds no state logic and cannot compute a transition from a stale prop.
     */
    onSortToggle: (key: string) => void;
  };
}
