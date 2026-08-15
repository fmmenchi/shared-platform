import { defineMessages } from '../../i18n/messages.js';

/**
 * The format hint, one letter-group per part.
 *
 * THESE ARE COPY, NOT FORMATTING, the same split `dateInputMessages` makes. The
 * ORDER of the parts, the SEPARATOR between them and the hour CYCLE are
 * formatting questions and `Intl.DateTimeFormat` answers all three; what an
 * hour is abbreviated to is a word in a language, and `Intl` has no opinion on
 * it. `formatToParts` hands back `'hour'`, which is a type name, not a hint.
 *
 * THE DAY PERIOD IS NOT HERE, and that is the one difference from the date
 * hints. Its two words come from `Intl` — `AM`/`PM`, `ص`/`م`, `午前`/`午後` — so
 * the field can show the reader the very strings it will accept, in the very
 * script it will accept them in. A hint written down here would be a third
 * spelling of something the platform already knows two of.
 */
export const timeInputMessages = defineMessages('timeInput', {
  en: {
    hour: 'hh',
    minute: 'mm',
    second: 'ss',
  },
  it: {
    hour: 'hh',
    minute: 'mm',
    second: 'ss',
  },
  ar: {
    // سس for ساعة, دد for دقيقة, ثث for ثانية — Arabic groups for an Arabic
    // reader, because the date hints shipped four Latin letters for one
    // afternoon and that is exactly the mismatch this family exists to remove.
    hour: 'سس',
    minute: 'دد',
    second: 'ثث',
  },
});
