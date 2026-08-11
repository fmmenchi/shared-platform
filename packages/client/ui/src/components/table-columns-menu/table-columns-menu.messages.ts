import { defineMessages } from '../../i18n/messages.js';

/**
 * The menu's own copy, and not the table's: this control says what the READER
 * has done to the view, while the toolbar says what the view is showing.
 *
 * THE COUNT IS IN THE NAME for the same reason the filter trigger's state is in
 * its own: "some columns are put away" rendered as a glyph is information
 * carried by a picture, and a reader who arrives at the button by keyboard
 * meets the name first. "Columns, 2 of 4 shown" is the whole state before the
 * menu is even opened.
 *
 * THE TWO REFUSALS SAY WHY, separately, because they are different facts and a
 * single "unavailable" would teach nothing: one column names the rows and one
 * is the only one left. A disabled control whose reason is not announced is a
 * dead end with no explanation.
 */
export const tableColumnsMenuMessages = defineMessages('tableColumnsMenu', {
  en: {
    name: 'Columns, {shown} of {total} shown',
    required: '{column}, always shown because it names the rows',
    lastOne: '{column}, the only column still shown',
  },
  it: {
    name: 'Colonne, {shown} di {total} mostrate',
    required: '{column}, sempre mostrata perché dà il nome alle righe',
    lastOne: '{column}, l’unica colonna ancora mostrata',
  },
  ar: {
    name: 'الأعمدة، {shown} من {total} معروضة',
    required: '{column}، معروض دائمًا لأنه يسمّي الصفوف',
    lastOne: '{column}، العمود الوحيد المعروض',
  },
});
