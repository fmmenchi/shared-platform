import { defineMessages } from '../../i18n/messages.js';

/**
 * The calendar's own words.
 *
 * Everything a DATE says — the month name, the weekday abbreviations, the digits
 * — comes from `Intl` and is not here. What is here is what the COMPONENT says:
 * the names of its two buttons and the sentence it announces when the month
 * changes under a reader who cannot see it change.
 *
 * `month` carries a hole rather than being concatenated, for the reason the i18n
 * spoke gives: a fragment plus a name puts the word order in the code, and the
 * order is not the same in every language.
 */
export const calendarMessages = defineMessages('calendar', {
  en: {
    previous: 'Previous month',
    next: 'Next month',
    month: 'Showing {month}',
  },
  it: {
    previous: 'Mese precedente',
    next: 'Mese successivo',
    month: 'Stai vedendo {month}',
  },
  ar: {
    previous: 'الشهر السابق',
    next: 'الشهر التالي',
    month: 'يعرض {month}',
  },
});
