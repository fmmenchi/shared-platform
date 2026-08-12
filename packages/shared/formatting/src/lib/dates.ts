import { getDateTimeFormat } from './intl-cache.js';
import type {
  FormatDateOptions,
  FormatDateTimeOptions,
  FormatTimeOptions,
} from './dates.types.js';
import type { DateInput } from './values.types.js';

/**
 * Dates, written the way the reader's locale writes them.
 *
 * PURE AND ISOMORPHIC — no DOM, no React, no state — because the client and the
 * server have to agree. An invoice PDF that says `01/02/2026` beside a screen
 * that says `02/01/2026` is one bug with two owners, and the only way to have
 * one owner is for both to call the same function.
 *
 * NOTHING IS INVENTED ON TOP OF `Intl`. The styles are `dateStyle` and
 * `timeStyle` passed through; the zone is `timeZone` passed through. What this
 * file adds is the three things a call site gets wrong on its own: the
 * formatter is cached, an absent or unparseable value produces an empty string
 * instead of "Invalid Date", and the zone is a stated parameter rather than
 * whatever the process happens to run in.
 */

/**
 * The instant, or `null` when there is not one.
 *
 * ONE OWNER FOR THE PARSE. A payload delivers `null`, `''`, an ISO string, a
 * timestamp or an already-built `Date`, and every call site that handles that
 * itself handles it slightly differently. An unparseable string is `null` and
 * not a `Date` whose `getTime()` is `NaN`, because the latter formats as
 * "Invalid Date" — a string that reaches the screen and looks like data.
 */
export function toDate(value: DateInput | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A date: `31 gennaio 2026`, `Jan 31, 2026`, `31/01/2026`.
 *
 * An empty value gives an EMPTY STRING rather than a dash, an "n/a" or a
 * placeholder. What a missing value should look like is a decision about the
 * screen it is on, and a formatter that answers it takes that decision away
 * from the only layer that can see the column.
 */
export function formatDate(
  value: DateInput | null | undefined,
  locale?: string,
  options: FormatDateOptions = {},
): string {
  const date = toDate(value);
  if (date === null) return '';
  return getDateTimeFormat(locale, {
    dateStyle: options.style ?? 'medium',
    timeZone: options.timeZone,
  }).format(date);
}

/** A date and a clock: `31 gen 2026, 14:05`. */
export function formatDateTime(
  value: DateInput | null | undefined,
  locale?: string,
  options: FormatDateTimeOptions = {},
): string {
  const date = toDate(value);
  if (date === null) return '';
  return getDateTimeFormat(locale, {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle ?? 'short',
    timeZone: options.timeZone,
  }).format(date);
}

/** A clock alone: `14:05`. */
export function formatTime(
  value: DateInput | null | undefined,
  locale?: string,
  options: FormatTimeOptions = {},
): string {
  const date = toDate(value);
  if (date === null) return '';
  return getDateTimeFormat(locale, {
    timeStyle: options.style ?? 'short',
    timeZone: options.timeZone,
  }).format(date);
}

/**
 * The form a machine reads — what belongs in `<time dateTime="…">`.
 *
 * THIS IS THE HALF EVERYONE DROPS. A formatted date is for a person; the
 * element that carries it is required to state the same instant unambiguously,
 * and without it a `<time>` is a `<span>` with extra letters. It is also the
 * only part of a date that must NOT be localised — the attribute has one
 * grammar, and it is ISO 8601.
 *
 * `dateOnly` gives `2026-01-31` for a value where the clock is noise. It is
 * derived in the requested ZONE rather than by slicing the UTC ISO string,
 * because slicing is where the day comes out wrong for every reader east or
 * west of the meridian the server happens to sit on.
 */
export function toMachineDate(
  value: DateInput | null | undefined,
  options: { dateOnly?: boolean; timeZone?: string } = {},
): string {
  const date = toDate(value);
  if (date === null) return '';
  if (options.dateOnly !== true) return date.toISOString();

  const parts = getDateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: options.timeZone,
  }).format(date);
  // `en-CA` writes `YYYY-MM-DD`, which is the grammar the attribute wants —
  // asking the platform for it beats assembling it from parts by hand.
  return parts;
}
