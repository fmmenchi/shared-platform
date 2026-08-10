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
   *
   * TWO THINGS THE TYPE CANNOT SAY. The key is a plain `string` — an index
   * signature, so a typo compiles and is then silently never found; the hook
   * warns at runtime instead when the active key matches neither a comparator
   * nor a property of the rows. And "empty values last in both directions" is
   * the ENGINE's guarantee, not sorting's: a comparator of your own is negated
   * whole for descending, so whatever it does with blanks is reversed with
   * everything else. Answer emptiness first if you care where it lands.
   *
   * Hoist it, or accept that an object literal is a new identity every render
   * and the ordering is recomputed each time.
   */
  compare?: Partial<Record<string, Comparator<T>>>;
  /**
   * Whether digits inside text are read as numbers. `true` by default, which is
   * right for labels ("Item 2" before "Item 10") and wrong for identifiers and
   * codes, where "007" and "7" would otherwise collate as one value.
   */
  numeric?: boolean;
}

export interface UseTableSortResult<T> extends UseSortStateResult {
  /**
   * The rows, ordered — and `readonly`, because the unsorted stop returns the
   * caller's own array by identity. Typed mutable it invited `rows.sort()`,
   * which then reordered the consumer's state in place on that one stop and
   * threw outright on a frozen array: a defect that appears on the third click.
   *
   * Recomputed when `rows`, the state, `compare` or the locale change by
   * IDENTITY. Each of the first three is commonly a fresh identity per render
   * — a filtered array, an inline comparator map, a state object rebuilt from
   * URL params — so hoist what you can if the row count makes it matter.
   */
  rows: readonly T[];
}
