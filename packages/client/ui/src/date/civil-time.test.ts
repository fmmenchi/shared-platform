import { describe, it, expect } from 'vitest';
import {
  formatIsoTime,
  fromTwelveHour,
  isoTimeOf,
  parseIsoTime,
  toTwelveHour,
} from './civil-time.js';

describe('parseIsoTime', () => {
  it('reads a time to the minute, and leaves seconds absent', () => {
    // Absent rather than zero: `09:00` and `09:00:00` are the same instant and
    // different ANSWERS, and a stored zero could not tell them apart.
    expect(parseIsoTime('09:30')).toEqual({ hour: 9, minute: 30 });
    expect('second' in (parseIsoTime('09:30') ?? {})).toBe(false);
  });

  it('reads a time to the second when it is written', () => {
    expect(parseIsoTime('09:30:45')).toEqual({
      hour: 9,
      minute: 30,
      second: 45,
    });
  });

  it('keeps midnight at hour 0 rather than 24', () => {
    expect(parseIsoTime('00:00')).toEqual({ hour: 0, minute: 0 });
  });

  it('refuses what a clock does not show', () => {
    // `24:00` and a leap second are both real in ISO 8601 and neither is a
    // reading. Refused rather than normalised into a different answer.
    expect(parseIsoTime('24:00')).toBeNull();
    expect(parseIsoTime('23:60')).toBeNull();
    expect(parseIsoTime('23:59:60')).toBeNull();
    expect(parseIsoTime('9:30')).toBeNull();
    expect(parseIsoTime('09:30:00.000')).toBeNull();
    expect(parseIsoTime('')).toBeNull();
    expect(parseIsoTime('half nine')).toBeNull();
  });
});

describe('isoTimeOf — one grammar, the loose end of it', () => {
  it('takes the clock reading out of a full instant', () => {
    // What `toISOString()` produces, and what a consumer passes without
    // thinking. The date family had two grammars that disagreed here, and a
    // form posted an instant a field had never shown.
    expect(isoTimeOf('2026-08-12T09:30:45.000Z')).toEqual({
      hour: 9,
      minute: 30,
      second: 45,
    });
    expect(isoTimeOf('2026-08-12 09:30')).toEqual({ hour: 9, minute: 30 });
  });

  it('takes a bare time unchanged', () => {
    expect(isoTimeOf('09:30')).toEqual({ hour: 9, minute: 30 });
  });

  it('still refuses a reading that does not exist', () => {
    expect(isoTimeOf('2026-08-12T25:00:00Z')).toBeNull();
    expect(isoTimeOf('nonsense')).toBeNull();
  });
});

describe('formatIsoTime', () => {
  it('pads, and follows the PRECISION rather than the value', () => {
    // A field asked for minutes never posts seconds it was not asked for; one
    // asked for seconds always posts them.
    expect(formatIsoTime({ hour: 9, minute: 5 })).toBe('09:05');
    expect(formatIsoTime({ hour: 9, minute: 5, second: 7 })).toBe('09:05');
    expect(formatIsoTime({ hour: 9, minute: 5 }, 'second')).toBe('09:05:00');
    expect(formatIsoTime({ hour: 9, minute: 5, second: 7 }, 'second')).toBe(
      '09:05:07',
    );
  });

  it('answers null for a reading that names no time', () => {
    expect(formatIsoTime({ hour: 24, minute: 0 })).toBeNull();
    expect(formatIsoTime({ hour: 9, minute: 60 })).toBeNull();
  });

  it('round-trips whatever it produced', () => {
    for (const iso of ['00:00', '09:05', '23:59', '12:00']) {
      const parsed = parseIsoTime(iso);
      expect(parsed).not.toBeNull();
      expect(formatIsoTime(parsed as { hour: number; minute: number })).toBe(
        iso,
      );
    }
  });
});

describe('the twelve-hour cycle, which is presentation and not the model', () => {
  it('turns midnight into 12 AM and noon into 12 PM', () => {
    // The two the naive `% 12` gets wrong, and the reason this is a function.
    expect(toTwelveHour(0)).toEqual({ hour: 12, pm: false });
    expect(toTwelveHour(12)).toEqual({ hour: 12, pm: true });
  });

  it('maps the ordinary hours', () => {
    expect(toTwelveHour(9)).toEqual({ hour: 9, pm: false });
    expect(toTwelveHour(13)).toEqual({ hour: 1, pm: true });
    expect(toTwelveHour(23)).toEqual({ hour: 11, pm: true });
  });

  it('comes back, midnight included', () => {
    expect(fromTwelveHour(12, false)).toBe(0);
    expect(fromTwelveHour(12, true)).toBe(12);
    expect(fromTwelveHour(1, true)).toBe(13);
    expect(fromTwelveHour(9, false)).toBe(9);
  });

  it('round-trips every hour of the day', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const shown = toTwelveHour(hour);
      expect(fromTwelveHour(shown.hour, shown.pm)).toBe(hour);
    }
  });
});
