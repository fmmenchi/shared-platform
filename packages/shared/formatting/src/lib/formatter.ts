import {
  formatDate,
  formatDateTime,
  formatTime,
  toMachineDate,
} from './dates.js';
import {
  currencyParts,
  formatCurrency,
  formatInteger,
  formatMoney,
  formatNumber,
  formatPercent,
  numericParts,
} from './numbers.js';
import { canonicalLocale } from './intl-cache.js';
import type { Formatter, FormatterDefaults } from './formatter.types.js';

/**
 * Bind a locale, and the two decisions an app makes once.
 *
 * CHEAP TO CALL, because the expensive part is not here: the object is a set of
 * closures over strings, and the formatters they reach live in the module cache
 * behind them. So a React hook may build one per render without measuring
 * anything, and a request handler may build one per request.
 *
 * THE DEFAULTS DO NOT WIN OVER AN EXPLICIT ARGUMENT, in either direction of
 * carelessness: a call that names a zone gets that zone, and a call that names
 * nothing gets the app's. Which is the ordinary rule, stated because the
 * alternative — defaults applied after the argument — is a bug that only shows
 * up in the one screen that overrides.
 */
export function createFormatter(
  locale?: string,
  defaults: FormatterDefaults = {},
): Formatter {
  const zone = defaults.timeZone;

  return {
    locale: canonicalLocale(locale),
    defaults,

    date: (value, options = {}) =>
      formatDate(value, locale, {
        ...options,
        timeZone: options.timeZone ?? zone,
      }),
    dateTime: (value, options = {}) =>
      formatDateTime(value, locale, {
        ...options,
        timeZone: options.timeZone ?? zone,
      }),
    time: (value, options = {}) =>
      formatTime(value, locale, {
        ...options,
        timeZone: options.timeZone ?? zone,
      }),
    machine: (value, options = {}) =>
      toMachineDate(value, { ...options, timeZone: options.timeZone ?? zone }),

    number: (value, options) => formatNumber(value, locale, options),
    integer: (value, options) => formatInteger(value, locale, options),
    percent: (value, options) => formatPercent(value, locale, options),

    currency: (value, currency, options) => {
      const code = currency ?? defaults.currency;
      // NO GUESS. Formatting an amount in a currency nobody named is the one
      // failure this package will not paper over with an empty string either:
      // it would put a number on screen with a symbol that is merely the most
      // common one. Nothing is the honest output; the column has to say.
      if (code === undefined) return '';
      return formatCurrency(value, code, locale, options);
    },
    money: (money, options) => formatMoney(money, locale, options),

    parts: () => numericParts(locale),
    currencyParts: (currency, display) => {
      const code = currency ?? defaults.currency;
      if (code === undefined) return { representation: '', position: 'before' };
      return currencyParts(code, locale, display);
    },
  };
}
