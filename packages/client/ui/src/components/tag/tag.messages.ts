import { defineMessages } from '../../i18n/messages.js';

/**
 * The remove control's name, which is the only copy this component owns.
 *
 * ONE STRING WITH A HOLE IN IT, never `t('remove') + ' ' + name`: the word order
 * belongs to the language, not to this file — Arabic reads right to left, and a
 * translator who cannot move the name cannot translate the sentence. The DS's
 * own `interpolate` fills it.
 *
 * TWO MESSAGES RATHER THAN AN EMPTY HOLE. A tag whose label is not plain text
 * (an avatar and a name, a highlighted match) has no string to put in the
 * sentence, and "Remove " with nothing after it is a name that trails off. The
 * unnamed form is a complete sentence in its own right, and the component warns
 * in development so the missing `name` gets passed rather than silently
 * shipping eight buttons all called "Remove".
 */
export const tagMessages = defineMessages('tag', {
  en: { remove: 'Remove {name}', removeUnnamed: 'Remove' },
  it: { remove: 'Rimuovi {name}', removeUnnamed: 'Rimuovi' },
  ar: { remove: 'إزالة {name}', removeUnnamed: 'إزالة' },
});
