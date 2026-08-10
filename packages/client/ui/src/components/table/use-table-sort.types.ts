import type { Comparator } from '../../sorting/compare.types.js';
import type {
  UseSortStateOptions,
  UseSortStateResult,
} from './use-sort-state.types.js';

export interface UseTableSortOptions<T> extends UseSortStateOptions {
  /**
   * A comparator per column key, for the columns the default cannot know —
   * `priority` is not alphabetical. Write the ASCENDING order only: the
   * direction is applied for you, so it is never expressed twice.
   */
  compare?: Record<string, Comparator<T>>;
  /**
   * Whether digits inside text are read as numbers. `true` by default, which is
   * right for labels ("Item 2" before "Item 10") and wrong for identifiers and
   * codes, where "007" and "7" would otherwise collate as one value.
   */
  numeric?: boolean;
}

export interface UseTableSortResult<T> extends UseSortStateResult {
  /** The rows, ordered. Memoised on the rows, the state and the locale. */
  rows: T[];
}
