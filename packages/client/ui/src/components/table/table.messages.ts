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
 * `selectionCount` IS A LABEL, not a sentence, and that is a constraint being
 * respected rather than a style choice. The i18n port interpolates and does not
 * pluralize — there is no `Intl.PluralRules` in it and no message anywhere else
 * in the package needs one — so "{count} rows selected" would ship "1 righe
 * selezionate" in Italian and would be wrong in four of Arabic's six plural
 * forms. Plurals are a gap in the port, and inventing them inside one
 * component's catalog would hide it.
 *
 * And the label has to agree with NOTHING, not merely with no number. The first
 * version read "Selezionati: {count}" — masculine plural, agreeing with a noun
 * (`righe`) that is feminine, and the Arabic was masculine singular where a
 * non-human plural takes feminine. A participle escapes the count and keeps the
 * gender; "Selezione: 3" / "التحديد: 3" names the thing instead, which is what
 * a counter beside a filter does in every language.
 *
 * `TableToolbar` HAS ITS OWN CATALOG, and briefly did not. Sharing this
 * one was argued as earned — "the bar and the live region say the same two
 * sentences about the same fact" — and neither half survived being checked:
 * three of the five keys the bar read were referenced by nothing else, so they
 * were its copy filed under this namespace; and the two that were genuinely
 * shared rendered DIFFERENTLY in the same instant while counting different
 * things. They are different facts. This one announces what a click just did
 * to the rows on THIS PAGE; the bar states what the rule covers, including
 * rows nobody here has seen.
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
    select: 'Select',
    selectRow: 'Select row',
    selectRowNamed: 'Select {name}',
    // THE VERB ONLY, and the row's name is pointed at rather than interpolated
    // when it is not words — the same split the selection labels make, for the
    // same reason: two fragments joined by `aria-labelledby` put the word order
    // in the code, which Japanese and Turkish are not.
    expand: 'Show details',
    expandRow: 'Show details for this row',
    expandRowNamed: 'Show details for {name}',
    detail: 'Details for {name}',
    detailRow: 'Row details',
    // THE PAGER'S NAME, said by the table rather than by the pager: a page can
    // hold several, and two landmarks called "Pagination" are two identical
    // entries in a screen reader's list.
    pagerFor: 'Pagination for {name}',
    selectAllRows: 'Select all rows',
    selectionCount: 'Selection: {count}',
    selectionAll: 'All rows selected.',
    selectionAllExcept: 'All rows selected except {count}.',
    selectionCleared: 'Selection cleared.',
  },
  it: {
    empty: 'Nessun risultato.',
    sortedAscending: 'Ordinato per {column}, crescente.',
    sortedDescending: 'Ordinato per {column}, decrescente.',
    sortCleared: 'Ordinamento rimosso, ordine originale.',
    select: 'Seleziona',
    selectRow: 'Seleziona riga',
    selectRowNamed: 'Seleziona {name}',
    expand: 'Mostra i dettagli',
    expandRow: 'Mostra i dettagli della riga',
    expandRowNamed: 'Mostra i dettagli di {name}',
    detail: 'Dettagli di {name}',
    detailRow: 'Dettagli della riga',
    pagerFor: 'Paginazione di {name}',
    selectAllRows: 'Seleziona tutte le righe',
    selectionCount: 'Selezione: {count}',
    selectionAll: 'Tutte le righe selezionate.',
    selectionAllExcept: 'Tutte le righe selezionate tranne {count}.',
    selectionCleared: 'Selezione annullata.',
  },
  ar: {
    empty: 'لا توجد نتائج.',
    sortedAscending: 'مُرتَّب حسب {column}، تصاعديًا.',
    sortedDescending: 'مُرتَّب حسب {column}، تنازليًا.',
    sortCleared: 'تمت إزالة الترتيب، الترتيب الأصلي.',
    select: 'تحديد',
    selectRow: 'تحديد الصف',
    selectRowNamed: 'تحديد {name}',
    expand: 'عرض التفاصيل',
    expandRow: 'عرض تفاصيل هذا الصف',
    expandRowNamed: 'عرض تفاصيل {name}',
    detail: 'تفاصيل {name}',
    detailRow: 'تفاصيل الصف',
    pagerFor: 'ترقيم صفحات {name}',
    selectAllRows: 'تحديد كل الصفوف',
    selectionCount: 'التحديد: {count}',
    selectionAll: 'تم تحديد كل الصفوف.',
    selectionAllExcept: 'تم تحديد كل الصفوف باستثناء {count}.',
    selectionCleared: 'تم إلغاء التحديد.',
  },
});
