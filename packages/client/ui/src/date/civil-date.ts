import type { CivilDate, IsoDate } from './civil-date.types.js';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
/**
 * The same date, with an instant allowed after it — `2026-08-12T00:00:00.000Z`,
 * which is what `Date.prototype.toISOString()` produces and therefore what a
 * consumer passes without thinking about it.
 */
const ISO_DAY_OF = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/;

/**
 * Does this triple name a day that exists? Asked of the calendar rather than of
 * a table of month lengths, so leap years — including the century rules — are
 * the engine's problem and not ours.
 *
 * `setUTCFullYear` rather than `Date.UTC`, because `Date.UTC(99, …)` means 1999
 * and a four-digit ISO string can legitimately say `0099`.
 */
function exists({ year, month, day }: CivilDate): boolean {
  // `YYYY` IS FOUR DIGITS, and that is a contract rather than a formality: a
  // year outside this range cannot be written in the shape `formatIsoDate`
  // promises, and the DOM would not take it either. Unbounded, `format` was
  // answering `'12345-01-01'` and `'00-1-01-01'` — strings its own parser
  // rejects, from a function whose whole job is to produce ones it accepts.
  // (ISO 8601's expanded years need a sign prefix and are a different format.)
  if (year < 0 || year > 9999) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(0);
  probe.setUTCFullYear(year, month - 1, day);
  probe.setUTCHours(0, 0, 0, 0);
  // A day past the end of its month rolls forward — 31 April becomes 1 May — so
  // a triple that survives the round trip is a real date.
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * THE DAY AN ISO STRING NAMES, whether or not it also names a time.
 *
 * One grammar, in one place, because there used to be two and they disagreed.
 * The mask took a pasted `2026-08-12T00:00:00` as the 12th of August — with a
 * reason: nobody's locale writes a four-digit run first AND separates with
 * hyphens by accident. An external write of the same string went through the
 * strict parser instead, failed, and left the field EMPTY while the carrier
 * held the datetime — so `setValue('dob', d.toISOString())`, which is the
 * natural thing to write, posted an instant the field had never shown.
 *
 * Truncating rather than refusing is the choice a DATE field owes: an instant
 * carries a timezone, and `2026-08-12T23:00:00Z` is two different days
 * depending on where you stand. Keeping only the day is the whole reason
 * `CivilDate` exists.
 *
 * Returns `null` for anything else, including a day that does not exist.
 */
export function isoDayOf(value: string): IsoDate | null {
  const match = ISO_DAY_OF.exec(value.trim());
  if (match === null) return null;
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  return parseIsoDate(day) === null ? null : (day as IsoDate);
}

/**
 * Read `YYYY-MM-DD` as the day it names, or `null` if it names none.
 *
 * Strict on purpose, and `isoDayOf` above is the permissive one built on it.
 * `new Date(value)` accepts almost anything and answers with an instant in the
 * local timezone; this accepts one shape and answers with a date, so
 * `2026-02-30` is `null` here and 2 March there.
 */
export function parseIsoDate(value: string): CivilDate | null {
  const match = ISO.exec(value);
  if (match === null) return null;
  const date: CivilDate = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return exists(date) ? date : null;
}

/**
 * Write the day back as `YYYY-MM-DD`, zero-padded — the form the DOM, the wire
 * and the database all want. Returns `null` for a triple that names no day, so
 * a round trip cannot invent one.
 */
export function formatIsoDate(date: CivilDate): IsoDate | null {
  if (!exists(date)) return null;
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}
