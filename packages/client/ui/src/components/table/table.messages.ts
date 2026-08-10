import { defineMessages } from '../../i18n/messages.js';

/**
 * The table's own micro-copy: what an empty result set says.
 *
 * It has a default rather than being opt-in, and that follows from the
 * component's own rule — `scope`, the accessible name and the empty row are not
 * behind props, because behind a prop they would be missing from most tables.
 * An empty `<tbody>` says nothing to anyone: on screen it reads as a table
 * still loading, and a screen reader entering it hears "table, 3 columns, 1
 * row" — the header — with no indication that the result set came back empty.
 *
 * Apps override the catalog when their wording differs, and a call site passes
 * `empty` when a particular table needs to say something specific.
 */
export const tableMessages = defineMessages('table', {
  en: {
    empty: 'No results.',
    sortedAscending: 'Sorted by {column}, ascending.',
    sortedDescending: 'Sorted by {column}, descending.',
  },
  it: {
    empty: 'Nessun risultato.',
    sortedAscending: 'Ordinato per {column}, crescente.',
    sortedDescending: 'Ordinato per {column}, decrescente.',
  },
  ar: {
    empty: 'لا توجد نتائج.',
    sortedAscending: 'مُرتَّب حسب {column}، تصاعديًا.',
    sortedDescending: 'مُرتَّب حسب {column}، تنازليًا.',
  },
});
