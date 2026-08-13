import { getDateTimeFormat } from './intl-cache.js';
import type {
  FormatDateOptions,
  FormatDateTimeOptions,
  FormatTimeOptions,
  ToMachineDateOptions,
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
/**
 * `2026-01-31` and nothing else — a date with no clock and no zone.
 *
 * A CIVIL DATE IS NOT AN INSTANT, and treating it as one is the most common
 * date bug there is. `new Date('1990-05-15')` is midnight UTC by
 * specification, so reading its day back "in the reader's zone" walks it
 * backwards: measured, a birthdate of `1990-05-15` rendered as **May 14** in
 * New York and Los Angeles, and as May 15 in Rome and Tokyo. The value is the
 * shape every API returns for a birthdate, a due date, an invoice date.
 *
 * So a value of this shape is read in UTC whatever zone the caller asked for.
 * The zone is not being ignored — it does not apply: nobody's birthday moves
 * when they fly.
 */
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Is this value a date with no clock? See `CIVIL_DATE`. */
function isCivilDate(value: DateInput | null | undefined): value is string {
  return typeof value === 'string' && CIVIL_DATE.test(value);
}

/** The zone this value is actually read in. */
function zoneOf(
  value: DateInput | null | undefined,
  requested: string | undefined,
): string | undefined {
  return isCivilDate(value) ? 'UTC' : requested;
}

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
    dateStyle: options.dateStyle ?? 'medium',
    timeZone: zoneOf(value, options.timeZone),
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
    timeZone: zoneOf(value, options.timeZone),
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
    timeStyle: options.timeStyle ?? 'short',
    timeZone: zoneOf(value, options.timeZone),
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
 * `dateOnly` gives `2026-01-31` for a value where the clock is noise. For an
 * INSTANT it is derived in the requested zone, because slicing the UTC ISO
 * string is where the day comes out wrong for a reader east or west of the
 * meridian the server sits on. For a value that was ALREADY a civil date the
 * string is returned untouched — see `CIVIL_DATE`: it has no zone to be read
 * in, and deriving one is what moved a birthdate to the day before.
 *
 * THE YEAR IS PADDED AND SIGNED BY HAND, because the platform will not do it:
 * `year: 'numeric'` is not zero-padded and carries no era, so measured, the
 * year 500 came out as `500-06-15` — not a date any parser accepts — and a BCE
 * year came out positive, stating the wrong year rather than an unparseable
 * one. Rare in a product table, and both are invalid markup in an attribute
 * whose only job is to be machine-readable.
 */
export function toMachineDate(
  value: DateInput | null | undefined,
  options: ToMachineDateOptions = {},
): string {
  const date = toDate(value);
  if (date === null) return '';
  if (options.dateOnly !== true) return date.toISOString();
  if (isCivilDate(value)) return value;

  // `en-CA` writes `YYYY-MM-DD`, and it is hard-coded rather than taken from
  // the reader: a locale carrying `u-ca-islamic` or `u-nu-arab` would put a
  // different calendar's year, or Arabic-Indic digits, into an attribute whose
  // grammar is ASCII ISO 8601.
  const parts = getDateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    era: 'short',
    timeZone: zoneOf(value, options.timeZone),
  }).formatToParts(date);

  const at = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const bc = /^b/i.test(at('era'));
  // Astronomical numbering: 1 BC is year 0, 2 BC is year -1. The expanded form
  // ISO 8601 gives a signed year is six digits.
  const year = bc ? Number(at('year')) - 1 : Number(at('year'));
  const digits = String(Math.abs(year)).padStart(
    bc || year > 9999 ? 6 : 4,
    '0',
  );
  const sign = bc ? '-' : year > 9999 ? '+' : '';

  return `${sign}${digits}-${at('month')}-${at('day')}`;
}
