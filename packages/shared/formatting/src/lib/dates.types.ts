import type { DateStyle, TimeStyle } from './values.types.js';

/** Shared by every date-shaped option bag. */
interface ZonedOptions {
  /**
   * Which zone the instant is READ IN.
   *
   * A `Date` is a point in time and carries no zone, so this is not a detail:
   * `2026-01-01T00:00:00Z` is the first of January in Rome and the thirty-first
   * of December in Lima, and both are correct answers to different questions.
   * Left out, the runtime's zone answers — which on a server is whatever the
   * container was started with, and is the reason a report generated at night
   * dates rows a day off.
   */
  timeZone?: string;
}

export interface FormatDateOptions extends ZonedOptions {
  /**
   * `Intl`'s own four.
   *
   * NAMED `dateStyle` AND NOT `style`, which is what it was: three sibling
   * functions spelled one concept two ways, so a caller who learned
   * `formatDate({ style })` wrote `formatDateTime({ style })` and silently got
   * the default. One name, in the platform's spelling.
   *
   * @default 'medium'
   */
  dateStyle?: DateStyle;
}

export interface FormatDateTimeOptions extends ZonedOptions {
  /** @default 'medium' */
  dateStyle?: DateStyle;
  /**
   * How much of the clock to show. `short` is hours and minutes, which is what
   * a table column almost always wants.
   *
   * @default 'short'
   */
  timeStyle?: TimeStyle;
}

export interface FormatTimeOptions extends ZonedOptions {
  /** Named `timeStyle` for the reason `FormatDateOptions.dateStyle` gives.
   *
   * @default 'short'
   */
  timeStyle?: TimeStyle;
}

/**
 * The machine form's options.
 *
 * A NAMED TYPE rather than an inline one, because it was written out twice —
 * here and on the bound `Formatter` — and two copies of a shape is one copy
 * away from disagreeing.
 */
export interface ToMachineDateOptions extends ZonedOptions {
  /**
   * `2026-01-31` instead of the full timestamp, for a value where the clock is
   * noise — and the only honest form for a value that never had one.
   */
  dateOnly?: boolean;
}
