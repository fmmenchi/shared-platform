import { defineMessages } from '../../i18n/messages.js';

/**
 * The range picker's own words.
 *
 * `picked` exists for the same reason `DatePicker`'s does and one more: the
 * calendar announces the range as it is chosen, but that region is INSIDE the
 * popover, which closes on the second click — a sentence set on a surface that
 * is going away is a sentence a reader may never be given. This one lives
 * beside the fields and outlives the choosing.
 */
export const dateRangePickerMessages = defineMessages('dateRangePicker', {
  en: {
    trigger: 'Choose dates from a calendar',
    picked: '{start} to {end} selected.',
  },
  it: {
    trigger: 'Scegli le date dal calendario',
    picked: 'Selezionato da {start} a {end}.',
  },
  ar: {
    trigger: 'اختر التواريخ من التقويم',
    picked: 'تم اختيار من {start} إلى {end}.',
  },
});
