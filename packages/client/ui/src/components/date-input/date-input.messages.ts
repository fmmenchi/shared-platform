import { defineMessages } from '../../i18n/messages.js';

/**
 * The format hint, one letter-group per part.
 *
 * THESE ARE COPY, NOT FORMATTING, and the distinction is why this file exists
 * beside a component whose other locale decision comes from `Intl`. The ORDER of
 * the parts and the SEPARATOR between them are formatting questions and
 * `Intl.DateTimeFormat` answers both; what a day is abbreviated to is a word in
 * a language — `gg` in Italian, `dd` in English — and `Intl` has no opinion on
 * it. `formatToParts` hands back `'day'`, which is a type name, not a hint.
 *
 * Assembled into a placeholder in the locale's own order, so `it` reads
 * `gg/mm/aaaa` and `en-US` reads `mm/dd/yyyy` without either string being
 * written down anywhere: writing them down is what makes the twenty-seventh
 * locale a rewrite instead of an addition.
 */
export const dateInputMessages = defineMessages('dateInput', {
  en: {
    day: 'dd',
    month: 'mm',
    year: 'yyyy',
  },
  it: {
    day: 'gg',
    month: 'mm',
    year: 'aaaa',
  },
  ar: {
    day: 'يي',
    month: 'شش',
    // سسسس, not `ssss`. Four Latin letters shipped here for one afternoon, so
    // an Arabic reader got two Arabic groups and one Latin one in the only
    // instruction this field gives — and bidi reordered the boundary between
    // them on top of that.
    year: 'سسسس',
  },
});
