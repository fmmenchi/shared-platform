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
 *
 * THE TWO RANGE SENTENCES ARE THE HALF A RANGE ADDS, and the half sighted
 * testing never notices missing. After the first click the grid is choosing an
 * END, and nothing on screen says so to a reader who cannot see the highlight
 * move — `rangeStart` says it, and names the day so the two clicks can be told
 * apart. `rangeWhole` closes it, because "selected" alone leaves the reader to
 * work out from two earlier announcements what they now have.
 */
export const calendarMessages = defineMessages('calendar', {
  en: {
    previous: 'Previous month',
    next: 'Next month',
    month: 'Showing {month}',
    rangeStart: '{date} selected as the start. Now choose the end.',
    rangeWhole: '{start} to {end} selected.',
    cellStart: '{date}, start of the range',
    cellEnd: '{date}, end of the range',
    cellSpan: '{date}, in the range',
  },
  it: {
    previous: 'Mese precedente',
    next: 'Mese successivo',
    month: 'Stai vedendo {month}',
    rangeStart: '{date} scelto come inizio. Ora scegli la fine.',
    rangeWhole: 'Selezionato da {start} a {end}.',
    cellStart: '{date}, inizio dell’intervallo',
    cellEnd: '{date}, fine dell’intervallo',
    cellSpan: '{date}, nell’intervallo',
  },
  ar: {
    previous: 'الشهر السابق',
    next: 'الشهر التالي',
    month: 'يعرض {month}',
    rangeStart: 'تم اختيار {date} كبداية. اختر النهاية الآن.',
    rangeWhole: 'تم اختيار من {start} إلى {end}.',
    cellStart: '{date}، بداية النطاق',
    cellEnd: '{date}، نهاية النطاق',
    cellSpan: '{date}، ضمن النطاق',
  },
});
