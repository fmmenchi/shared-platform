import { describe, it, expect } from 'vitest';
import {
  addDays,
  addMonths,
  compareDays,
  daysInMonth,
  isSameDay,
  startOfMonth,
  startOfWeek,
  weekdayOf,
} from './civil-math.js';

describe('civil-date arithmetic', () => {
  describe('daysInMonth', () => {
    it('knows the ordinary months', () => {
      expect(daysInMonth(2026, 1)).toBe(31);
      expect(daysInMonth(2026, 4)).toBe(30);
      expect(daysInMonth(2026, 2)).toBe(28);
    });

    it('leaves the century rules to the calendar', () => {
      // The three cases a hand-written rule gets wrong, in order of how often.
      expect(daysInMonth(2024, 2)).toBe(29);
      expect(daysInMonth(1900, 2)).toBe(28);
      expect(daysInMonth(2000, 2)).toBe(29);
    });
  });

  describe('weekdayOf', () => {
    it('numbers Sunday 0, as Date and Intl both do', () => {
      expect(weekdayOf({ year: 2026, month: 8, day: 9 })).toBe(0);
      expect(weekdayOf({ year: 2026, month: 8, day: 12 })).toBe(3);
    });

    it('reads a two-digit year as itself, not as 19xx', () => {
      // `Date.UTC(99, …)` means 1999 — the trap `setUTCFullYear` exists to
      // avoid. Asserted as the DIFFERENCE, because that is the claim: the two
      // years fall on different weekdays, so a conversion that quietly meant
      // 1999 would be visible here and nowhere else.
      expect(weekdayOf({ year: 99, month: 3, day: 4 })).toBe(3);
      expect(weekdayOf({ year: 1999, month: 3, day: 4 })).toBe(4);
    });
  });

  describe('addDays', () => {
    it('crosses a month, a year and a leap day', () => {
      expect(addDays({ year: 2026, month: 8, day: 31 }, 1)).toEqual({
        year: 2026,
        month: 9,
        day: 1,
      });
      expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
        year: 2027,
        month: 1,
        day: 1,
      });
      expect(addDays({ year: 2024, month: 2, day: 28 }, 1)).toEqual({
        year: 2024,
        month: 2,
        day: 29,
      });
    });

    it('goes backwards too, which is what the up arrow needs', () => {
      expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
        year: 2026,
        month: 2,
        day: 28,
      });
      expect(addDays({ year: 2026, month: 8, day: 12 }, -7)).toEqual({
        year: 2026,
        month: 8,
        day: 5,
      });
    });
  });

  describe('addMonths', () => {
    it('clamps rather than rolling forward', () => {
      // `new Date(2026, 0, 31)` plus a month is 3 March, and holding PageDown
      // from the 31st would then skip February altogether.
      expect(addMonths({ year: 2026, month: 1, day: 31 }, 1)).toEqual({
        year: 2026,
        month: 2,
        day: 28,
      });
      expect(addMonths({ year: 2024, month: 1, day: 31 }, 1)).toEqual({
        year: 2024,
        month: 2,
        day: 29,
      });
    });

    it('crosses years in both directions', () => {
      expect(addMonths({ year: 2026, month: 12, day: 15 }, 1)).toEqual({
        year: 2027,
        month: 1,
        day: 15,
      });
      expect(addMonths({ year: 2026, month: 1, day: 15 }, -1)).toEqual({
        year: 2025,
        month: 12,
        day: 15,
      });
      expect(addMonths({ year: 2026, month: 1, day: 15 }, -13)).toEqual({
        year: 2024,
        month: 12,
        day: 15,
      });
    });

    it('is a year when it is twelve', () => {
      expect(addMonths({ year: 2024, month: 2, day: 29 }, 12)).toEqual({
        year: 2025,
        month: 2,
        day: 28,
      });
    });
  });

  describe('startOfWeek', () => {
    it('walks back to the day the week starts on', () => {
      const wednesday = { year: 2026, month: 8, day: 12 };
      // Sunday-first: back to the 9th. Monday-first: back to the 10th.
      expect(startOfWeek(wednesday, 0)).toEqual({
        year: 2026,
        month: 8,
        day: 9,
      });
      expect(startOfWeek(wednesday, 1)).toEqual({
        year: 2026,
        month: 8,
        day: 10,
      });
    });

    it('does not walk into the wrong week for a Saturday-first locale', () => {
      // The case a subtraction without the modulo gets wrong: Saturday is 6, so
      // a naive shift sends a Wednesday back eleven days.
      expect(startOfWeek({ year: 2026, month: 8, day: 12 }, 6)).toEqual({
        year: 2026,
        month: 8,
        day: 8,
      });
    });

    it('crosses a month boundary, which is the whole point of the grid', () => {
      expect(startOfWeek({ year: 2026, month: 9, day: 1 }, 1)).toEqual({
        year: 2026,
        month: 8,
        day: 31,
      });
    });
  });

  it('startOfMonth keeps the month and forgets the day', () => {
    expect(startOfMonth({ year: 2026, month: 8, day: 12 })).toEqual({
      year: 2026,
      month: 8,
      day: 1,
    });
  });

  it('compares and equates by the day, not by identity', () => {
    const a = { year: 2026, month: 8, day: 12 };
    expect(isSameDay(a, { ...a })).toBe(true);
    expect(isSameDay(a, { ...a, day: 13 })).toBe(false);
    expect(compareDays(a, { year: 2026, month: 9, day: 1 })).toBeLessThan(0);
    expect(compareDays(a, { year: 2025, month: 12, day: 31 })).toBeGreaterThan(
      0,
    );
    expect(compareDays(a, { ...a })).toBe(0);
  });
});
