import { defineMessages } from '../../i18n/messages.js';

/**
 * The table's own micro-copy: what an empty result set says, and what a change
 * of order says to somebody not looking at it.
 *
 * `sortCleared` is not an afterthought — it is the stop that would otherwise be
 * announced by SILENCE. Emptying a live region says nothing: `role="status"`
 * implies `aria-relevant="additions text"`, so removing text is not in the
 * relevant set and no screen reader reports it. The third click therefore
 * reordered every row and told the one reader who could not see it nothing at
 * all, which is worse than the two stops that do speak.
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
    sortCleared: 'Sorting removed, original order.',
  },
  it: {
    empty: 'Nessun risultato.',
    sortedAscending: 'Ordinato per {column}, crescente.',
    sortedDescending: 'Ordinato per {column}, decrescente.',
    sortCleared: 'Ordinamento rimosso, ordine originale.',
  },
  ar: {
    empty: 'لا توجد نتائج.',
    sortedAscending: 'مُرتَّب حسب {column}، تصاعديًا.',
    sortedDescending: 'مُرتَّب حسب {column}، تنازليًا.',
    sortCleared: 'تمت إزالة الترتيب، الترتيب الأصلي.',
  },
});
