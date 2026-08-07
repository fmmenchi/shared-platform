import { defineMessages } from '../../i18n/messages.js';

/**
 * The submenu's way back, which exists only where there are no arrow keys to
 * do it: on a touch screen the parent menu steps aside for the one it opened,
 * so something has to lead back to it.
 *
 * The row SHOWS the command that opened the submenu — the consumer's own word,
 * not ours. This is the part that says what the row does, and it is read to a
 * screen reader rather than drawn: "Back to Share".
 *
 * ONE STRING WITH A HOLE IN IT, not a fragment the component finishes. It used
 * to be `back: 'Back to'` glued to the name at the call site, which puts the
 * word order in the code: every locale had to be "<something> <name>". Japanese
 * is "共有に戻る" — the name FIRST and the verb last — and Turkish and Finnish
 * inflect the name itself. None of that was reachable by a translator, and, more
 * to the point, an app overriding `menuContent.back` could not reach it either:
 * it could replace the fragment and not the order.
 */
export const menuContentMessages = defineMessages('menuContent', {
  en: { back: 'Back to {name}' },
  it: { back: 'Torna a {name}' },
  ar: { back: 'العودة إلى {name}' },
});
