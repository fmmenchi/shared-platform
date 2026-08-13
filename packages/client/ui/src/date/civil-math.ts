import type { CivilDate } from './civil-date.types.js';

/**
 * Arithmetic on a civil date — a day, not an instant.
 *
 * The JavaScript date horror stories all come from doing this on a `Date`, which
 * carries a time and a timezone: add a month to one in a zone that changes its
 * offset and you can land an hour into the previous day. None of that can happen
 * here, because none of it is represented. A `Date` appears in exactly one
 * place, `weekdayOf`, where it is built and read in UTC and thrown away — the
 * calendar's own leap rules are worth borrowing, and a table of month lengths
 * that has to know about 1900 and 2000 is worth not writing.
 *
 * ADR-0027 says this is convenience rather than capability, and that Temporal
 * will replace it without changing a caller. That is why every function here
 * takes and returns `CivilDate` and nothing else.
 */

/** Days in a month, with February asked of the calendar rather than a rule. */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the NEXT month is the last day of this one — the one trick worth
  // using, because it makes the century leap rules the engine's problem.
  const probe = new Date(0);
  probe.setUTCFullYear(year, month, 0);
  return probe.getUTCDate();
}

/** 0 for Sunday through 6 for Saturday, as `Date` and `Intl` both number them. */
export function weekdayOf({ year, month, day }: CivilDate): number {
  const probe = new Date(0);
  probe.setUTCFullYear(year, month - 1, day);
  probe.setUTCHours(0, 0, 0, 0);
  return probe.getUTCDay();
}

/** The same day, `days` later — or earlier, for a negative count. */
export function addDays(date: CivilDate, days: number): CivilDate {
  const probe = new Date(0);
  probe.setUTCFullYear(date.year, date.month - 1, date.day + days);
  probe.setUTCHours(0, 0, 0, 0);
  return {
    year: probe.getUTCFullYear(),
    month: probe.getUTCMonth() + 1,
    day: probe.getUTCDate(),
  };
}

/**
 * The same day-of-month, `months` later, CLAMPED to the end of the month it
 * lands in.
 *
 * 31 January plus one month is 28 February, not 3 March. Rolling forward is what
 * `Date` does and it is wrong for a calendar: pressing PageDown twice from the
 * 31st would visit March and then April, skipping February entirely, and the
 * user would watch the highlighted day jump about while they held one key.
 * Every date library that has thought about this — Temporal included, with its
 * `overflow: 'constrain'` default — clamps.
 */
export function addMonths(date: CivilDate, months: number): CivilDate {
  const zeroBased = date.month - 1 + months;
  const year = date.year + Math.floor(zeroBased / 12);
  const month = (((zeroBased % 12) + 12) % 12) + 1;
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

/** The first of the month `date` is in. */
export function startOfMonth({ year, month }: CivilDate): CivilDate {
  return { year, month, day: 1 };
}

/**
 * The start of the week `date` is in, for a week that begins on `firstDay`.
 *
 * `firstDay` is 0-6 as the weekdays are numbered, so a locale that starts on
 * Monday passes 1 and one that starts on Saturday passes 6 — the modulo is what
 * keeps the second of those from walking backwards into the wrong week.
 */
export function startOfWeek(date: CivilDate, firstDay: number): CivilDate {
  const shift = (weekdayOf(date) - firstDay + 7) % 7;
  return addDays(date, -shift);
}

/** Do these name the same day? */
export function isSameDay(a: CivilDate, b: CivilDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** Negative, zero or positive — the shape a comparator wants. */
export function compareDays(a: CivilDate, b: CivilDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}
