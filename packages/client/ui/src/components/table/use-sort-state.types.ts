import type { SortBy } from '../../sorting/compare.types.js';

export interface UseSortStateOptions {
  /**
   * Controlled: you hold the order. Read by PRESENCE, not by value — an empty
   * list is a legal state ("nothing sorted") and a consumer round-tripping it
   * through a URL naturally hands back nothing for it.
   */
  sort?: SortBy;
  /** Uncontrolled seed — a restored order, or the one the page opens with. */
  defaultSort?: SortBy;
  /** Shorthand for a single ascending column. */
  defaultSortKey?: string;
  onSortChange?: (sort: SortBy) => void;
}

export interface UseSortStateResult {
  /** The whole order, in precedence. Empty is unsorted. */
  state: SortBy;
  /** Spread onto `Table`. */
  props: {
    sort: SortBy;
    onSortToggle: (key: string, options: { additive: boolean }) => void;
  };
}
