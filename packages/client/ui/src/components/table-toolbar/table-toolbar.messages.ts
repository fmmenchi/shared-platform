import { defineMessages } from '../../i18n/messages.js';

/**
 * The bar's own copy, colocated — which it was not at first, and the exception
 * did not survive being checked.
 *
 * It read `table`'s catalog, argued as earned because the bar and the live
 * region "say the same two sentences about the same fact". Measured, neither
 * half held: three of the five keys were referenced only here, so they were
 * this component's copy filed under another's namespace; and the two that were
 * shared rendered DIFFERENTLY in the same instant — "Selection: 1,500" on
 * screen against "Selection: 1500" in the region — while counting different
 * things. They are different facts: the region announces what a click just did
 * to the rows on this page, the bar states what the RULE covers, including
 * rows nobody has seen.
 *
 * `selectionCount` is a LABEL, not a sentence, for the reason `table`'s is: the
 * port interpolates and does not pluralize, and a participle would escape the
 * number only to trip over gender.
 */
export const tableToolbarMessages = defineMessages('tableToolbar', {
  en: {
    region: 'Table controls',
    actions: 'Table actions',
    count: 'Selection: {count}',
    all: 'All rows selected.',
    allExcept: 'All rows selected except {count}.',
    selectAllMatching: 'Select all {total}',
    clear: 'Clear selection',
    filtered: 'Showing {shown} of {total}',
    filteredCount: 'Showing {shown}',
    filteredBy: 'Filtered by: {columns}',
    clearFilters: 'Clear filters',
  },
  it: {
    region: 'Controlli tabella',
    actions: 'Azioni tabella',
    count: 'Selezione: {count}',
    all: 'Tutte le righe selezionate.',
    allExcept: 'Tutte le righe selezionate tranne {count}.',
    selectAllMatching: 'Seleziona tutte le {total}',
    clear: 'Annulla selezione',
    filtered: 'Righe: {shown} di {total}',
    filteredCount: 'Righe: {shown}',
    filteredBy: 'Filtrato per: {columns}',
    clearFilters: 'Annulla filtri',
  },
  ar: {
    region: 'أدوات الجدول',
    actions: 'إجراءات الجدول',
    count: 'التحديد: {count}',
    all: 'تم تحديد كل الصفوف.',
    allExcept: 'تم تحديد كل الصفوف باستثناء {count}.',
    selectAllMatching: 'تحديد الكل ({total})',
    clear: 'إلغاء التحديد',
    filtered: 'عرض {shown} من {total}',
    filteredCount: 'عرض {shown}',
    filteredBy: 'مُرشَّح حسب: {columns}',
    clearFilters: 'إلغاء عوامل التصفية',
  },
});
