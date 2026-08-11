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
/**
 * The whole order, in precedence: the first entry decides, the second breaks
 * its ties, and so on. An empty list is unsorted.
 *
 * A LIST AND NOT A NULLABLE PAIR, which is what this was. Filters have always
 * been plural — `FilterState` is a record, several columns narrow the view at
 * once — and sorting was the one axis that could only hold a single opinion.
 * The single case is a list of one, which every table library converges on for
 * the same reason: the alternative is two shapes and a normalisation at every
 * read.
 */
export type SortBy = readonly SortState[];

export type Comparator<T> = (a: T, b: T) => number;
