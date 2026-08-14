import { defineMessages } from '../../i18n/messages.js';

/**
 * The picker's own words. Everything else it says belongs to a part — the
 * calendar names its month buttons, the field announces its format — and none
 * of it is repeated here.
 *
 * `triggerFor` exists because `trigger` alone stops being a name the moment
 * there are two pickers on a page: a screen-reader user pulling up a list of
 * buttons, or landing on one after a scroll, meets "Choose from a calendar"
 * twice with nothing to tell them apart. Neither `Field` nor `InputGroup`
 * contributes a naming ancestor, so the field's own label has to travel into
 * the button — which `FormDatePicker` can do, because it is given one.
 *
 * `picked` is the other half of the same silence. Choosing a day closes the
 * popover and the platform returns focus to the trigger, whose name never
 * changes, so the whole announcement was "Choose from a calendar, button,
 * collapsed" — the date the user just chose said nowhere.
 *
 * Both carry a hole rather than being concatenated, for the reason the i18n
 * spoke gives: a fragment plus a value puts the word order in the code, and the
 * order is not the same in every language.
 */
export const datePickerMessages = defineMessages('datePicker', {
  en: {
    trigger: 'Choose from a calendar',
    triggerFor: 'Choose {field} from a calendar',
    picked: '{date} selected',
  },
  it: {
    trigger: 'Scegli dal calendario',
    triggerFor: 'Scegli {field} dal calendario',
    picked: 'Selezionato {date}',
  },
  ar: {
    trigger: 'اختر من التقويم',
    triggerFor: 'اختر {field} من التقويم',
    picked: 'تم اختيار {date}',
  },
});
