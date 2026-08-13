import { describe, it, expect, beforeEach } from 'vitest';
import {
  canonicalLocale,
  clearFormatCache,
  getDateTimeFormat,
  getNumberFormat,
} from './intl-cache.js';

beforeEach(() => {
  clearFormatCache();
});

describe('the formatter cache', () => {
  it('hands back the same formatter for the same question', () => {
    const first = getNumberFormat('it-IT', { style: 'decimal' });
    expect(getNumberFormat('it-IT', { style: 'decimal' })).toBe(first);
  });

  it('does not care in which order the options were written', () => {
    // `{ dateStyle, timeZone }` and `{ timeZone, dateStyle }` describe one
    // formatter, and would otherwise build two.
    const first = getDateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    });
    const second = getDateTimeFormat('it-IT', {
      timeZone: 'UTC',
      dateStyle: 'medium',
    });
    expect(second).toBe(first);
  });

  it('treats an option left out and one passed as undefined as the same', () => {
    const first = getNumberFormat('it-IT', { style: 'decimal' });
    const second = getNumberFormat('it-IT', {
      style: 'decimal',
      minimumFractionDigits: undefined,
    });
    expect(second).toBe(first);
  });

  it('reads one locale spelled three ways as one locale', () => {
    // `de-DE`, `de-de` and `DE-de` are one locale and three cache keys
    // otherwise.
    const first = getNumberFormat('de-DE', { style: 'decimal' });
    expect(getNumberFormat('de-de', { style: 'decimal' })).toBe(first);
    expect(getNumberFormat('DE-de', { style: 'decimal' })).toBe(first);
  });

  it('falls back rather than throwing on the tag a Java backend sends', () => {
    // `new Intl.NumberFormat('en_US')` throws a RangeError. Uncaught inside a
    // cell renderer that is an exception mid-render.
    expect(canonicalLocale('en_US')).toBeUndefined();
    expect(() => getNumberFormat('en_US', { style: 'decimal' })).not.toThrow();
  });

  it('is capped, because on a server the locale comes from the request', () => {
    // `de-DE-u-nu-…` are all valid, all distinct: an unbounded map keyed on
    // request input is unbounded growth keyed on request input. The oldest goes
    // first, one at a time — emptying the map instead is a cache that stops
    // working under exactly the load it was capped for.
    const oldest = getNumberFormat('aa', { style: 'decimal' });
    for (let i = 0; i < 60; i += 1) {
      getNumberFormat(`de-DE-u-nu-latn-x-a${i}`, { style: 'decimal' });
    }
    expect(getNumberFormat('aa', { style: 'decimal' })).not.toBe(oldest);
  });

  it('costs enough to be worth caching', () => {
    // The claim the file header makes, measured rather than asserted: a table
    // of a thousand rows with three formatted columns constructs three thousand
    // formatters per render otherwise.
    const ROUNDS = 3000;

    const cold = performance.now();
    for (let i = 0; i < ROUNDS; i += 1) {
      new Intl.NumberFormat('it-IT', { style: 'decimal' }).format(i);
    }
    const uncached = performance.now() - cold;

    const warm = performance.now();
    for (let i = 0; i < ROUNDS; i += 1) {
      getNumberFormat('it-IT', { style: 'decimal' }).format(i);
    }
    const cached = performance.now() - warm;

    // Deliberately loose: this asserts the ORDER of the difference, not a
    // number that would make the suite a benchmark and fail on a busy machine.
    expect(cached).toBeLessThan(uncached);
  });
});
