import { describe, it, expect } from 'vitest';
import { createFormatter } from './formatter.js';

const NEW_YEAR = '2026-01-01T00:00:00Z';

describe('createFormatter', () => {
  it('answers the locale once so no call site has to', () => {
    const fmt = createFormatter('it-IT');
    expect(fmt.number(12345.5)).toBe('12.345,5');
    expect(fmt.date(NEW_YEAR, { timeZone: 'UTC' })).toBe('1 gen 2026');
  });

  it('applies the app-wide zone, and yields to a call that names one', () => {
    // The ordinary rule, stated because the alternative — defaults applied
    // after the argument — is a bug that only shows up in the one screen that
    // overrides.
    const fmt = createFormatter('en-GB', { timeZone: 'America/Lima' });
    expect(fmt.date(NEW_YEAR)).toBe('31 Dec 2025');
    expect(fmt.date(NEW_YEAR, { timeZone: 'Europe/Rome' })).toBe('1 Jan 2026');
  });

  it('carries the zone into the machine form too', () => {
    const fmt = createFormatter('en-GB', { timeZone: 'America/Lima' });
    expect(fmt.machine(NEW_YEAR, { dateOnly: true })).toBe('2025-12-31');
  });

  it('uses the app currency, and refuses to guess when there is none', () => {
    // An amount rendered in the wrong currency is not a formatting mistake, it
    // is a different number — so the fallback is something an app states or
    // does not have, and nothing is the honest output.
    const euro = createFormatter('it-IT', { currency: 'EUR' });
    expect(euro.currency(10)).toBe('10,00 €');
    expect(euro.currency(10, 'USD')).toBe('10,00 USD');

    const bare = createFormatter('it-IT');
    expect(bare.currency(10)).toBe('');
    expect(bare.currencyParts()).toEqual({
      representation: '',
      position: 'before',
    });
  });

  it('canonicalises the locale it reports, and survives one it cannot', () => {
    expect(createFormatter('de-de').locale).toBe('de-DE');
    expect(createFormatter('en_US').locale).toBeUndefined();
  });
});
