import { defineMessages } from '../../i18n/messages.js';

/**
 * The submenu's way back, which exists only where there are no arrow keys to
 * do it: on a touch screen the parent menu steps aside for the one it opened,
 * so something has to lead back to it.
 *
 * The row SHOWS the command that opened the submenu — the consumer's own word,
 * not ours. This is the part that says what the row does, and it is read to a
 * screen reader rather than drawn: "Back to Share".
 */
export const menuContentMessages = defineMessages('menuContent', {
  en: { back: 'Back to' },
  it: { back: 'Torna a' },
  ar: { back: 'العودة إلى' },
});
