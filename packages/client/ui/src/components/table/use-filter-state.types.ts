import type { FilterState } from '../../filtering/filter.types.js';

export interface UseFilterStateOptions {
  /**
   * Controlled: you hold the filters. Read by PRESENCE, not by value, so
   * passing `undefined` is controlled-and-empty rather than uncontrolled — the
   * same correction `useSortState` and `useRowSelection` both needed, because
   * "no filters" is a legal state and a consumer round-tripping it through a
   * URL hands back nothing for it.
   */
  filters?: FilterState;
  /** Uncontrolled seed. */
  defaultFilters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
}

export interface UseFilterStateResult {
  /** What is in force — the value a query key wants, unchanged. */
  state: FilterState;
  /** The columns actually filtered; a blank value is not a filter. */
  active: string[];
  /** Set the whole set at once — a restore, or a preset. */
  setFilters: (next: FilterState) => void;
  /** Spread onto the parts that report filter intents. */
  props: {
    filters: FilterState;
    /**
     * A column's filter was APPLIED — not typed. The editor holds a draft and
     * this is the moment it becomes the view, which is the whole reason the
     * popover has an Apply: filtering as you type removes rows under a reader
     * continuously, and that is the silent-reorder problem sorting already had.
     */
    onFilterApply: (key: string, value: string) => void;
    onClearFilters: () => void;
  };
}
