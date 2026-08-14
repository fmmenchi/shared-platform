import { defineMessages } from '../../i18n/messages.js';

/**
 * The picker's own words, which are exactly one: the name of the button that
 * opens the grid.
 *
 * Everything else it says belongs to a part — the calendar names its month
 * buttons, the field announces its format — and none of it is repeated here.
 */
export const datePickerMessages = defineMessages('datePicker', {
  en: { trigger: 'Choose from a calendar' },
  it: { trigger: 'Scegli dal calendario' },
  ar: { trigger: 'اختر من التقويم' },
});
