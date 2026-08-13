import { describe, it, expect } from 'vitest';
import { parseIsoDate, formatIsoDate } from './civil-date.js';

describe('parseIsoDate', () => {
  it('reads a day as the day it names', () => {
    expect(parseIsoDate('2026-08-12')).toEqual({
      year: 2026,
      month: 8,
      day: 12,
    });
  });

  it('counts months the way a human does', () => {
    // The other classic date defect: `Date` numbers January 0, so a value
    // round-tripped through it comes back a month early.
    expect(parseIsoDate('2026-01-01')?.month).toBe(1);
    expect(parseIsoDate('2026-12-31')?.month).toBe(12);
  });

  it('does not answer with an instant, so no timezone can move it', () => {
    // THE defect this module exists to prevent, and it is not hypothetical:
    // this suite runs in America/Lima (UTC-5), where the browser's own
    // `valueAsDate` for this string reports 11 August to every local question.
    const parsed = parseIsoDate('2026-08-12');
    expect(parsed).toEqual({ year: 2026, month: 8, day: 12 });
    // For contrast, the trap itself — proved rather than asserted, so this test
    // fails if the environment ever stops being able to demonstrate it.
    expect(new Date('2026-08-12').getDate()).not.toBe(12);
  });

  it('refuses a day that does not exist', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-04-31')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('2026-00-10')).toBeNull();
    expect(parseIsoDate('2026-01-00')).toBeNull();
    // `new Date('2026-02-30')` is 2 March. This is the difference.
  });

  it('knows the leap-year rules, because it asks the calendar', () => {
    expect(parseIsoDate('2024-02-29')?.day).toBe(29); // divisible by 4
    expect(parseIsoDate('2026-02-29')).toBeNull(); // ordinary year
    expect(parseIsoDate('1900-02-29')).toBeNull(); // century, not by 400
    expect(parseIsoDate('2000-02-29')?.day).toBe(29); // century, by 400
  });

  it('accepts one shape and only that shape', () => {
    // `new Date` takes all of these and answers something.
    expect(parseIsoDate('12/08/2026')).toBeNull();
    expect(parseIsoDate('2026-8-12')).toBeNull();
    expect(parseIsoDate('2026-08-12T00:00:00Z')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate('yesterday')).toBeNull();
  });

  it('reads a year below 100 as that year', () => {
    // `Date.UTC(99, 0, 1)` is 1999, which is why the implementation does not
    // use it. A four-digit string that says 0099 means the year 99.
    expect(parseIsoDate('0099-03-04')).toEqual({
      year: 99,
      month: 3,
      day: 4,
    });
  });
});

describe('formatIsoDate', () => {
  it('writes the form the DOM and the wire want', () => {
    expect(formatIsoDate({ year: 2026, month: 8, day: 12 })).toBe('2026-08-12');
  });

  it('pads, so the string is always sortable and always parseable', () => {
    expect(formatIsoDate({ year: 2026, month: 1, day: 2 })).toBe('2026-01-02');
    expect(formatIsoDate({ year: 99, month: 3, day: 4 })).toBe('0099-03-04');
  });

  it('refuses to invent a day, rather than rolling it forward', () => {
    expect(formatIsoDate({ year: 2026, month: 2, day: 30 })).toBeNull();
    expect(formatIsoDate({ year: 2026, month: 13, day: 1 })).toBeNull();
  });

  it('round-trips', () => {
    for (const iso of [
      '2026-08-12',
      '2024-02-29',
      '2000-02-29',
      '0099-03-04',
    ]) {
      const parsed = parseIsoDate(iso);
      expect(parsed).not.toBeNull();
      expect(formatIsoDate(parsed!)).toBe(iso);
    }
  });
});
