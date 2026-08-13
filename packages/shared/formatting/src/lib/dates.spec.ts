import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  toDate,
  toMachineDate,
} from './dates.js';

/** Midnight UTC on New Year's Day — the instant that is two different days. */
const NEW_YEAR = '2026-01-01T00:00:00Z';

describe('toDate', () => {
  it('takes the three shapes a payload delivers', () => {
    const iso = '2026-01-01T00:00:00.000Z';
    expect(toDate(new Date(NEW_YEAR))?.toISOString()).toBe(iso);
    expect(toDate(Date.parse(NEW_YEAR))?.toISOString()).toBe(iso);
    expect(toDate(NEW_YEAR)?.toISOString()).toBe(iso);
  });

  it('answers null for nothing, and for a string that is not a date', () => {
    // An unparseable string must not come back as a `Date` whose time is NaN:
    // that one formats as "Invalid Date", a string that reaches the screen and
    // looks like data.
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate('')).toBeNull();
    expect(toDate('not a date')).toBeNull();
    expect(toDate(new Date('nope'))).toBeNull();
  });
});

describe('formatDate', () => {
  it('writes the date the way the locale writes it', () => {
    expect(formatDate(NEW_YEAR, 'it-IT', { timeZone: 'UTC' })).toBe(
      '1 gen 2026',
    );
    expect(formatDate(NEW_YEAR, 'en-US', { timeZone: 'UTC' })).toBe(
      'Jan 1, 2026',
    );
  });

  it('is a different DAY in a different zone, which is why the zone is a parameter', () => {
    // A `Date` is a point in time and carries no zone. The same instant is the
    // first of January in Rome and the thirty-first of December in Lima, and
    // both are correct answers to different questions — so the question has to
    // be asked out loud rather than answered by whatever zone the process was
    // started in.
    expect(formatDate(NEW_YEAR, 'en-GB', { timeZone: 'Europe/Rome' })).toBe(
      '1 Jan 2026',
    );
    expect(formatDate(NEW_YEAR, 'en-GB', { timeZone: 'America/Lima' })).toBe(
      '31 Dec 2025',
    );
  });

  it('speaks the platform vocabulary of styles, not a private one', () => {
    // `short` here is `Intl`'s short and nothing else. A hand-made table is how
    // "short" comes to mean a date with no year in one codebase and a
    // two-digit year in the next.
    expect(
      formatDate(NEW_YEAR, 'en-GB', { style: 'short', timeZone: 'UTC' }),
    ).toBe('01/01/2026');
    expect(
      formatDate(NEW_YEAR, 'en-GB', { style: 'full', timeZone: 'UTC' }),
    ).toBe('Thursday, 1 January 2026');
  });

  it('gives an empty string for a missing value, and decides nothing else', () => {
    // Not a dash, not "n/a": what a missing value should look like is a
    // decision about the screen it is on, and only that layer can see it.
    expect(formatDate(null, 'it-IT')).toBe('');
    expect(formatDate(undefined, 'it-IT')).toBe('');
    expect(formatDate('nonsense', 'it-IT')).toBe('');
  });

  it('survives a locale tag the constructor would throw on', () => {
    // `en_US` is what a Java or POSIX backend sends, and `new Intl.…` throws on
    // it — uncaught inside a cell renderer that is an exception mid-render.
    expect(() => formatDate(NEW_YEAR, 'en_US')).not.toThrow();
    expect(formatDate(NEW_YEAR, 'en_US')).not.toBe('');
  });
});

describe('formatDateTime and formatTime', () => {
  it('writes a clock beside the date', () => {
    expect(
      formatDateTime('2026-01-31T14:05:00Z', 'it-IT', { timeZone: 'UTC' }),
    ).toBe('31 gen 2026, 14:05');
  });

  it('writes the clock alone', () => {
    expect(
      formatTime('2026-01-31T14:05:00Z', 'it-IT', { timeZone: 'UTC' }),
    ).toBe('14:05');
  });
});

describe('toMachineDate', () => {
  it('is ISO and never localised', () => {
    // The attribute has one grammar, and it is not the reader's.
    expect(toMachineDate(NEW_YEAR)).toBe('2026-01-01T00:00:00.000Z');
  });

  it('derives a date-only form IN THE ZONE, not by slicing the ISO string', () => {
    // Slicing `toISOString()` is the obvious shortcut and it is wrong for every
    // reader east or west of the meridian the server sits on: the instant below
    // is still 2025 in Lima.
    expect(
      toMachineDate(NEW_YEAR, { dateOnly: true, timeZone: 'Europe/Rome' }),
    ).toBe('2026-01-01');
    expect(
      toMachineDate(NEW_YEAR, { dateOnly: true, timeZone: 'America/Lima' }),
    ).toBe('2025-12-31');
  });

  it('is empty when there is nothing to state', () => {
    expect(toMachineDate(null)).toBe('');
  });
});
