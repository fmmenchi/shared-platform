/**
 * Which columns are filtered, and to what.
 *
 * A `string` per column, and that is a decision rather than a limitation.
 * Filters are a PROJECTION PARAMETER — they change which rows exist, so they
 * belong in a query key and in a URL, next to the sort. A discriminated union
 * of kinds would express more and serialize worse, and the moment a value stops
 * round-tripping through a search param the state stops surviving a reload,
 * which is the one thing a filter has to do.
 *
 * What a value MEANS is the column's business: the default reads it as "the
 * cell contains this", and a column that means something else says so with its
 * own predicate.
 */
export type FilterState = Readonly<Record<string, string>>;

/** A column's own answer to "does this row match?". */
export type RowFilter<T> = (row: T, value: string) => boolean;
