import type { SortState } from '../../sorting/compare.types.js';

export interface UseSortStateOptions {
  /** Controlled: you hold the state, and the table only displays it. */
  sort?: SortState | null;
  /** Uncontrolled seed. */
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
    onSortChange: (sort: SortState | null) => void;
  };
}
