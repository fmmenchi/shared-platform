import { describe, it, expect } from 'vitest';
import {
  currencyParts,
  formatCurrency,
  formatInteger,
  formatMoney,
  formatNumber,
  formatPercent,
  numericParts,
} from './numbers.js';

describe('formatNumber', () => {
  it('writes the number the way the locale writes it', () => {
    expect(formatNumber(12345.5, 'it-IT')).toBe('12.345,5');
    expect(formatNumber(12345.5, 'en-US')).toBe('12,345.5');
  });

  it('KEEPS ZERO, which every hand-rolled formatter drops', () => {
    // `value ? format(value) : ''` is the guard every call site writes, and it
    // is a defect with a very quiet failure: a balance of zero, a count of zero
    // and a delta of zero all render as an empty cell, which a reader takes for
    // missing data rather than for the answer.
    expect(formatNumber(0, 'it-IT')).toBe('0');
    expect(formatInteger(0, 'it-IT')).toBe('0');
    expect(formatPercent(0, 'it-IT')).toBe('0%');
    expect(formatCurrency(0, 'EUR', 'it-IT')).toBe('0,00 €');
  });

  it('is empty for absence, and for the NaN arithmetic produces', () => {
    // `Intl` prints NaN as "NaN" — a string that reaches the screen and looks
    // like a value.
    expect(formatNumber(null, 'it-IT')).toBe('');
    expect(formatNumber(undefined, 'it-IT')).toBe('');
    expect(formatNumber(Number.NaN, 'it-IT')).toBe('');
  });

  it('drops the grouping for a number that is an identifier', () => {
    // A year, an order number, a postcode: `2.026` is simply wrong.
    expect(formatNumber(2026000, 'it-IT', { grouping: 'never' })).toBe(
      '2026000',
    );
  });

  it('does not let a maximum fall below a minimum', () => {
    // `Intl` throws a RangeError when it does, which inside a cell renderer is
    // the page rather than the cell.
    expect(() =>
      formatNumber(1.5, 'it-IT', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 2,
      }),
    ).not.toThrow();
    expect(
      formatNumber(1.5, 'it-IT', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 2,
      }),
    ).toBe('1,5000');
  });
});

describe('formatCurrency', () => {
  it('puts the symbol where the locale puts it', () => {
    expect(formatCurrency(1234.5, 'EUR', 'it-IT')).toBe('1234,50 €');
    expect(formatCurrency(1234.5, 'EUR', 'en-US')).toBe('€1,234.50');
  });

  it('LEAVES THE GROUPING TO THE LANGUAGE, which is not the same as turning it on', () => {
    // CLDR gives Italian a `minimumGroupingDigits` of 2: four digits are
    // written plain and five are grouped. Measured — forcing `useGrouping:
    // true`, which is what a formatter written by hand does, produces
    // `1.234,50 €`, a separator an Italian reader is not supposed to see.
    expect(formatNumber(1234, 'it-IT')).toBe('1234');
    expect(formatNumber(12345, 'it-IT')).toBe('12.345');
    expect(formatNumber(1234, 'it-IT', { grouping: 'always' })).toBe('1.234');
    // English has no such rule, so the same call groups.
    expect(formatNumber(1234, 'en-US')).toBe('1,234');
  });

  it('lets the CURRENCY decide the minor unit, which a hand-written 2 does not', () => {
    // Yen has no minor unit; Dinar has three. `Intl` knows both.
    expect(formatCurrency(1234, 'JPY', 'en-US')).toBe('¥1,234');
    expect(formatCurrency(1234.5, 'BHD', 'en-US')).toBe('BHD 1,234.500');
  });

  it('takes an amount that carries its own currency', () => {
    // A row in a mixed-currency table has a currency that belongs to the row.
    expect(formatMoney({ amount: 10, currency: 'USD' }, 'en-US')).toBe(
      '$10.00',
    );
    expect(formatMoney(null, 'en-US')).toBe('');
  });
});

describe('formatPercent', () => {
  it('reads a ratio by default, because that is what Intl does', () => {
    expect(formatPercent(0.15, 'it-IT')).toBe('15%');
  });

  it('reads units when the column literally holds a percentage', () => {
    // The difference is a factor of a hundred and is invisible in review, so it
    // is a named parameter rather than a convention.
    expect(formatPercent(15, 'it-IT', { scale: 'units' })).toBe('15%');
  });
});

describe('numericParts', () => {
  it('reads the separators off the runtime rather than a table of locales', () => {
    expect(numericParts('it-IT')).toEqual({ decimal: ',', group: '.' });
    expect(numericParts('en-US')).toEqual({ decimal: '.', group: ',' });
  });

  it('reports the character the runtime actually emits', () => {
    // French groups with a narrow no-break space (U+202F), not the ordinary
    // space anybody assuming would have written — and parsing what a reader
    // typed means knowing which character they were shown.
    const french = numericParts('fr-FR');
    expect(french.decimal).toBe(',');
    expect(french.group).not.toBe(' ');
    expect(french.group.charCodeAt(0)).toBeGreaterThan(127);
  });
});

describe('currencyParts', () => {
  it('says which side the symbol goes, which a stylesheet cannot assume', () => {
    expect(currencyParts('EUR', 'it-IT')).toEqual({
      representation: '€',
      position: 'after',
    });
    expect(currencyParts('EUR', 'en-US')).toEqual({
      representation: '€',
      position: 'before',
    });
  });

  it('does not throw on a currency code nobody validated', () => {
    // The CONSTRUCTOR throws a RangeError on a code it does not know — from
    // inside a cell renderer that is the page rather than the cell.
    expect(() => currencyParts('NOTACODE', 'it-IT')).not.toThrow();
    expect(currencyParts('NOTACODE', 'it-IT').representation).toBe('NOTACODE');
  });

  it('keeps the number when the code is unknown, rather than the row', () => {
    // Hiding it behind an empty string turns a bad code in the DATA into a hole
    // on the screen that nobody can trace back to it.
    expect(formatCurrency(1234.5, 'NOTACODE', 'en-US')).toBe(
      '1,234.50 NOTACODE',
    );
  });
});
