/**
 * What a caller may hand over as an instant.
 *
 * A `Date`, a timestamp, or the ISO string an API payload actually delivers —
 * one type, because a table cell holds whatever the endpoint sent and pushing
 * the conversion back to the caller means every caller writes the same three
 * lines with a different bug in each.
 */
export type DateInput = Date | number | string;

/** An amount and the currency it is in. Always together — see `formatMoney`. */
export interface Money {
  /** The monetary value as a number. */
  amount: number;
  /** ISO-4217 code: `EUR`, `USD`, `GBP`. */
  currency: string;
}

/**
 * How much of a date to show, in the platform's own vocabulary.
 *
 * These are `Intl`'s four `dateStyle` values, passed straight through and NOT
 * re-tabulated into a private set of `day`/`month`/`year` options. A hand-made
 * table is how "short" comes to mean a date with no year in one codebase and a
 * date with a two-digit year in the next, and neither matches what the platform
 * calls short — two vocabularies for one idea, and the reader learns whichever
 * one leaks.
 */
export type DateStyle = 'full' | 'long' | 'medium' | 'short';
