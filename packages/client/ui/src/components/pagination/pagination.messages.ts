import { defineMessages } from '../../i18n/messages.js';

/**
 * The pager's copy.
 *
 * `page` AND `current` ARE TWO MESSAGES, not one with a suffix. A control
 * called "3" is a control announced as "three" with no hint of what it does,
 * which is why every number carries the word; and the one in force says so in
 * the same breath rather than relying on `aria-current` alone, because the
 * paint that marks it is colour and the attribute is not read by every
 * combination of browser and screen reader.
 *
 * `announcement` EXISTS BECAUSE THE ROWS CHANGE IN SILENCE. Pressing Next
 * replaces everything under the pager and moves nothing that a reader who
 * cannot see it would notice — the same silent change sorting had, at a larger
 * scale.
 */
export const paginationMessages = defineMessages('pagination', {
  en: {
    label: 'Pagination',
    page: 'Page {page}',
    current: 'Page {page}, current page',
    previous: 'Previous page',
    next: 'Next page',
    announcement: 'Page {page} of {pageCount}',
  },
  it: {
    label: 'Paginazione',
    page: 'Pagina {page}',
    current: 'Pagina {page}, pagina corrente',
    previous: 'Pagina precedente',
    next: 'Pagina successiva',
    announcement: 'Pagina {page} di {pageCount}',
  },
  ar: {
    label: 'ترقيم الصفحات',
    page: 'الصفحة {page}',
    current: 'الصفحة {page}، الصفحة الحالية',
    previous: 'الصفحة السابقة',
    next: 'الصفحة التالية',
    announcement: 'الصفحة {page} من {pageCount}',
  },
});
