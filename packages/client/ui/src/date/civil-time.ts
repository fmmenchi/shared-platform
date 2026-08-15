import type { CivilTime, IsoTime, TimePrecision } from './civil-time.types.js';

/** `HH:mm` with optional `:ss`, and nothing else. */
const ISO_TIME = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
/**
 * The same, with anything allowed after it — `09:00:00.000Z`, or the time half
 * of a full ISO instant. What `Date.prototype.toISOString()` produces and what
 * a consumer therefore passes without thinking about it.
 */
const ISO_TIME_LOOSE = /^(?:.*[T ])?(\d{2}):(\d{2})(?::(\d{2}))?(?:[.,]\d+)?/;

/** Does this triple name a time that exists? */
function exists({ hour, minute, second }: CivilTime): boolean {
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  // 24:00 and a leap second are both real in ISO 8601 and neither is a time a
  // clock shows, so both are refused here rather than normalised into a
  // different answer than the one that was written.
  if (second !== undefined && (second < 0 || second > 59)) return false;
  return true;
}

/**
 * Read `HH:mm` or `HH:mm:ss` as the time it names, or `null` if it names none.
 *
 * Strict on purpose, and for the reason `parseIsoDate` is: `new Date(value)`
 * accepts almost anything and answers with an instant in the local timezone,
 * which is precisely the conversion this type exists to refuse.
 */
export function parseIsoTime(value: string): CivilTime | null {
  const match = ISO_TIME.exec(value);
  if (match === null) return null;
  const time: CivilTime = {
    hour: Number(match[1]),
    minute: Number(match[2]),
    ...(match[3] === undefined ? {} : { second: Number(match[3]) }),
  };
  return exists(time) ? time : null;
}

/**
 * THE TIME AN ISO STRING NAMES, whether or not it also names a date.
 *
 * One grammar in one place, which the date family learned the hard way: it had
 * two, they disagreed, and a `setValue(name, d.toISOString())` — the natural
 * thing to write — left a field empty while the form posted an instant.
 *
 * Truncating rather than refusing is what a TIME field owes. An instant carries
 * a date and a zone; keeping only the clock reading is the whole reason
 * `CivilTime` exists.
 */
export function isoTimeOf(value: string): CivilTime | null {
  const match = ISO_TIME_LOOSE.exec(value.trim());
  if (match === null) return null;
  const time: CivilTime = {
    hour: Number(match[1]),
    minute: Number(match[2]),
    ...(match[3] === undefined ? {} : { second: Number(match[3]) }),
  };
  return exists(time) ? time : null;
}

/**
 * Write the time back as `HH:mm` or `HH:mm:ss`, zero-padded — the form the DOM,
 * the wire and the database all want.
 *
 * `precision` decides the shape rather than the value's own `second` field, so
 * a field asked for minutes never posts seconds it was not asked for, and one
 * asked for seconds always posts them. Returns `null` for a triple that names
 * no time, so a round trip cannot invent one.
 */
export function formatIsoTime(
  time: CivilTime,
  precision: TimePrecision = 'minute',
): IsoTime | null {
  if (!exists(time)) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  const head = `${pad(time.hour)}:${pad(time.minute)}`;
  return precision === 'second' ? `${head}:${pad(time.second ?? 0)}` : head;
}

/**
 * The same clock reading in the twelve-hour cycle: 0 becomes 12 AM, 13 becomes
 * 1 PM. Returned as a number and a flag rather than a string, because the WORD
 * is copy and belongs to the message catalogue — `Intl` will name a day period
 * for a locale, but what a half-typed field shows in its third segment is a
 * word in a language.
 */
export function toTwelveHour(hour: number): { hour: number; pm: boolean } {
  const pm = hour >= 12;
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return { hour: shown, pm };
}

/** And back, which is the half that has an edge case: 12 AM is midnight. */
export function fromTwelveHour(hour: number, pm: boolean): number {
  const base = hour % 12;
  return pm ? base + 12 : base;
}

/**
 * THE FOUR CYCLES A CLOCK CAN BE READ IN, because `Intl` reports four and a
 * field that handled two would be wrong in the other two rather than merely
 * incomplete.
 *
 * Measured, forcing each cycle on a locale that has it:
 *
 * | cycle | midnight | noon  | 23:05 | reads    |
 * | ----- | -------- | ----- | ----- | -------- |
 * | h11   | 00 AM    | 00 PM | 11 PM | 0–11     |
 * | h12   | 12 AM    | 12 PM | 11 PM | 1–12     |
 * | h23   | 00       | 12    | 23    | 0–23     |
 * | h24   | 24       | 12    | 23    | 1–24     |
 *
 * `h11` is the one that surprises: it is Japanese's, and it writes midnight and
 * noon BOTH as `00`, distinguished only by 午前/午後. A field that assumed
 * `h12`'s `12` there would show a time nobody in that locale writes.
 */
export type HourCycle = 'h11' | 'h12' | 'h23' | 'h24';

/** The hour as this cycle writes it, and whether it needs a PM marker. */
export function hourInCycle(
  hour: number,
  cycle: HourCycle,
): { hour: number; pm: boolean } {
  switch (cycle) {
    case 'h11':
      return { hour: hour % 12, pm: hour >= 12 };
    case 'h12':
      return toTwelveHour(hour);
    case 'h24':
      return { hour: hour === 0 ? 24 : hour, pm: false };
    default:
      return { hour, pm: false };
  }
}

/**
 * And back to the 0–23 the model holds.
 *
 * `pm` is ignored by the cycles that have no day period, so a caller does not
 * have to know which those are — it passes what it read and gets the hour.
 */
export function hourFromCycle(
  hour: number,
  cycle: HourCycle,
  pm: boolean,
): number {
  switch (cycle) {
    case 'h11':
    case 'h12':
      return fromTwelveHour(hour, pm);
    case 'h24':
      return hour % 24;
    default:
      return hour;
  }
}

/** Does this cycle need to be told AM from PM to name an hour? */
export function cycleHasPeriod(cycle: HourCycle): boolean {
  return cycle === 'h11' || cycle === 'h12';
}

/** The hours this cycle may write, which is what the mask enforces. */
export function cycleRange(cycle: HourCycle): {
  floor: number;
  ceiling: number;
} {
  switch (cycle) {
    case 'h11':
      return { floor: 0, ceiling: 11 };
    case 'h12':
      return { floor: 1, ceiling: 12 };
    case 'h24':
      return { floor: 1, ceiling: 24 };
    default:
      return { floor: 0, ceiling: 23 };
  }
}
