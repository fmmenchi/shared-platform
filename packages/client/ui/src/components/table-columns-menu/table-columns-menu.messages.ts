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
 * THE REFUSALS ARE CLAUSES, not sentences, because a locked column may still be
 * MOVED — so its entry has to carry both facts, and a reason that repeated the
 * column's name would say it twice. They say why separately, because they are different facts and a
 * single "unavailable" would teach nothing: one column names the rows and one
 * is the only one left. A disabled control whose reason is not announced is a
 * dead end with no explanation.
 */
export const tableColumnsMenuMessages = defineMessages('tableColumnsMenu', {
  en: {
    name: 'Columns, {shown} of {total} shown',
    required: 'always shown because it names the rows',
    lastOne: 'the only column still shown',
    at: '{column}, {position} of {total}',
    moveHint: 'Alt with the arrow keys moves a column.',
  },
  it: {
    name: 'Colonne, {shown} di {total} mostrate',
    required: 'sempre mostrata perché dà il nome alle righe',
    lastOne: 'l’unica colonna ancora mostrata',
    at: '{column}, {position} di {total}',
    moveHint: 'Alt con i tasti freccia sposta una colonna.',
  },
  ar: {
    name: 'الأعمدة، {shown} من {total} معروضة',
    required: 'معروض دائمًا لأنه يسمّي الصفوف',
    lastOne: 'العمود الوحيد المعروض',
    at: '{column}، {position} من {total}',
    moveHint: 'Alt مع مفاتيح الأسهم ينقل عمودًا.',
  },
});
