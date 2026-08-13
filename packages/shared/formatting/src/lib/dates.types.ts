import type { DateStyle } from './values.types.js';

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
  /** @default 'medium' */
  style?: DateStyle;
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
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

export interface FormatTimeOptions extends ZonedOptions {
  /** @default 'short' */
  style?: 'full' | 'long' | 'medium' | 'short';
}
