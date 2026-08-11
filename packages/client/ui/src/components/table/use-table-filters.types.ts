import type { FilterState, RowFilter } from '../../filtering/filter.types.js';
import type {
  UseFilterStateOptions,
  UseFilterStateResult,
} from './use-filter-state.types.js';

export interface UseTableFiltersOptions<T> extends UseFilterStateOptions {
  /**
   * A predicate per column, for the columns whose value does not mean "the
   * cell contains this" — a number that means "at least", a date that means
   * "since", an enum matched by identity rather than by text.
   *
   * The key is a plain `string`, so a typo compiles and is then never found;
   * the hook warns at runtime when a filtered key matches neither a predicate
   * nor a property of the rows. Hoist it, or accept that an object literal is a
   * new identity every render and the rows are recomputed each time.
   */
  filter?: Partial<Record<string, RowFilter<T>>>;
}

export interface UseTableFiltersResult<T> extends UseFilterStateResult {
  /**
   * The rows that survive — and the CALLER'S array, by identity, when nothing
   * is in force. An unfiltered table should not hand React a new identity on
   * every render.
   */
  rows: readonly T[];
  /**
   * Spread onto `TableToolbar`: what is in force, how many rows are left, and
   * the way back to all of them.
   */
  toolbarProps: {
    filters: FilterState;
    rowCount: number;
    onClearFilters: () => void;
  };
}
