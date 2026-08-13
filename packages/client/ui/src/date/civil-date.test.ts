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
    const parsed = parseIsoDate('2026-08-12');
    expect(parsed).toEqual({ year: 2026, month: 8, day: 12 });

    // THE DEFECT THIS MODULE EXISTS TO PREVENT, stated so that it holds in
    // every timezone rather than in the one the machine happens to be in.
    //
    // `new Date(iso)` is UTC midnight, always. So the LOCAL day it reports is
    // the ISO day only where the offset is not west of UTC: 11 in America/Lima,
    // 12 on a UTC runner. THAT THE ANSWER DEPENDS ON WHERE YOU RUN IT is the
    // defect — and the first version of this test asserted the Lima answer and
    // went red in CI, which is the same mistake one layer up.
    const naive = new Date('2026-08-12');
    expect(naive.getUTCDate()).toBe(12);
    expect(naive.getDate()).toBe(naive.getTimezoneOffset() > 0 ? 11 : 12);

    // Ours is the 12th wherever it runs, because it never builds an instant.
    expect(parsed?.day).toBe(12);
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

  it('never returns a string its own parser would reject', () => {
    // Found by attacking it: unbounded, these answered `'12345-01-01'` and
    // `'00-1-01-01'` — from a function whose whole contract is to produce a
    // string `parseIsoDate` accepts and the DOM understands. A four-digit year
    // is the format, not a formality.
    expect(formatIsoDate({ year: 12345, month: 1, day: 1 })).toBeNull();
    expect(formatIsoDate({ year: -1, month: 1, day: 1 })).toBeNull();
    expect(formatIsoDate({ year: 0, month: 1, day: 1 })).toBe('0000-01-01');
  });

  it('refuses anything that is not a whole number', () => {
    expect(formatIsoDate({ year: 2026, month: 8.5, day: 12 })).toBeNull();
    expect(formatIsoDate({ year: 2026, month: 8, day: 12.7 })).toBeNull();
    expect(formatIsoDate({ year: NaN, month: 8, day: 12 })).toBeNull();
    expect(formatIsoDate({ year: Infinity, month: 1, day: 1 })).toBeNull();
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
