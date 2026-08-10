/** Which way a column is ordered. No state at all means "not ordered". */
export type SortDirection = 'asc' | 'desc';

/**
 * How a table is ordered, as ONE value.
 *
 * The key and the direction are a single fact and have to move together: two
 * separate props would let a caller express a state that cannot exist — sorted
 * by `name` carrying the direction of `age`. It is also the shape a consumer
 * drops straight into a query key, unchanged.
 */
export interface SortState {
  key: string;
  direction: SortDirection;
}

/** What `Array.prototype.sort` wants, over whole rows rather than values. */
export type Comparator<T> = (a: T, b: T) => number;
