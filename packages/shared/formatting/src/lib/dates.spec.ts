import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearFormatCache } from './intl-cache.js';
import {
  formatDate,
  formatDateTime,
  formatTime,
  toDate,
  toMachineDate,
} from './dates.js';

beforeEach(() => {
  // The zone warning is said once per message; a suite needs each test to be
  // the first one.
  clearFormatCache();
});

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
      formatDate(NEW_YEAR, 'en-GB', { dateStyle: 'short', timeZone: 'UTC' }),
    ).toBe('01/01/2026');
    expect(
      formatDate(NEW_YEAR, 'en-GB', { dateStyle: 'full', timeZone: 'UTC' }),
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

describe('a civil date — a day with no clock and no zone', () => {
  /** What every API returns for a birthdate, a due date, an invoice date. */
  const BIRTHDAY = '1990-05-15';

  it('is the same day in every zone, which is the whole point of one', () => {
    // MEASURED BEFORE THIS: `new Date('1990-05-15')` is midnight UTC by
    // specification, so reading its day back "in the reader's zone" walked it
    // backwards — May 14 in New York and Los Angeles, May 15 in Rome and
    // Tokyo. Nobody's birthday moves when they fly.
    for (const timeZone of [
      'America/Los_Angeles',
      'America/New_York',
      'UTC',
      'Europe/Rome',
      'Asia/Tokyo',
    ]) {
      expect(formatDate(BIRTHDAY, 'en-GB', { timeZone })).toBe('15 May 1990');
      expect(toMachineDate(BIRTHDAY, { dateOnly: true, timeZone })).toBe(
        BIRTHDAY,
      );
    }
  });

  it('still reads an INSTANT in the zone it was given', () => {
    // The rule is about the shape of the value, not a blanket exemption: an
    // instant has a zone and the zone still decides.
    expect(
      formatDate('2026-01-01T00:00:00Z', 'en-GB', { timeZone: 'America/Lima' }),
    ).toBe('31 Dec 2025');
  });
});

describe('the machine form', () => {
  it('pads the year, which the platform will not', () => {
    // `year: 'numeric'` is not zero-padded, so the year 500 came out as
    // `500-06-15` — a value no parser accepts, in an attribute whose only job
    // is to be parseable.
    const old = new Date(Date.UTC(500, 5, 15));
    expect(toMachineDate(old, { dateOnly: true, timeZone: 'UTC' })).toBe(
      '0500-06-15',
    );
  });

  it('signs a year before the era, rather than stating the wrong one', () => {
    // `en-CA` emits no era marker, so a BCE date came back POSITIVE — the
    // wrong year rather than an unparseable one, which is the worse of the two
    // failures. ISO 8601 counts astronomically: 2 BC is year -1.
    const bc = new Date(Date.UTC(-1, 5, 15));
    bc.setUTCFullYear(-1);

    // `toISOString` is the oracle — it is the same grammar, and it agrees.
    expect(toMachineDate(bc, { dateOnly: true, timeZone: 'UTC' })).toBe(
      bc.toISOString().slice(0, 13),
    );
    expect(toMachineDate(bc, { dateOnly: true, timeZone: 'UTC' })).toBe(
      '-000001-06-15',
    );
  });
});

describe('a time zone the runtime does not know', () => {
  it('does not take the page down with it', () => {
    // `America/Sao_Paolo` is the standing typo for Sao_Paulo, and it arrives
    // from a config or a user profile exactly as a locale does. Measured: it
    // threw a RangeError from inside the render, which falsified this
    // package's own "nothing throws" in three documents.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() =>
      formatDate(NEW_YEAR, 'en-GB', { timeZone: 'America/Sao_Paolo' }),
    ).not.toThrow();
    expect(formatDate(NEW_YEAR, 'en-GB', { timeZone: 'GMT+2' })).not.toBe('');
    expect(
      toMachineDate(NEW_YEAR, { dateOnly: true, timeZone: 'Not/AZone' }),
    ).not.toBe('');

    // And it says which zone it refused, once — reached from a render, a
    // thousand rows would otherwise print a thousand identical lines.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('America/Sao_Paolo'),
    );
    warn.mockRestore();
  });
});
