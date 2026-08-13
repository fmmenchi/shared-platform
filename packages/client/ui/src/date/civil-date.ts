import type { CivilDate, IsoDate } from './civil-date.types.js';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Does this triple name a day that exists? Asked of the calendar rather than of
 * a table of month lengths, so leap years — including the century rules — are
 * the engine's problem and not ours.
 *
 * `setUTCFullYear` rather than `Date.UTC`, because `Date.UTC(99, …)` means 1999
 * and a four-digit ISO string can legitimately say `0099`.
 */
function exists({ year, month, day }: CivilDate): boolean {
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
 * Read `YYYY-MM-DD` as the day it names, or `null` if it names none.
 *
 * Strict on purpose. `new Date(value)` accepts almost anything and answers with
 * an instant in the local timezone; this accepts one shape and answers with a
 * date, so `2026-02-30` is `null` here and 2 March there.
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
