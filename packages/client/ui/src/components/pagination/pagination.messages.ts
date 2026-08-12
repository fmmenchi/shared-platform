import { defineMessages } from '../../i18n/messages.js';

/**
 * The pager's copy.
 *
 * `page` CARRIES THE WORD, because a control called "3" is announced as
 * "three" with no hint of what it does. It does NOT carry the state: there was
 * a second message saying "current page" in the name as well, and every screen
 * reader that maps `aria-current` then said it twice. GOV.UK, USWDS and Polaris
 * all name the control plainly and let the attribute do its job.
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
    previous: 'Previous page',
    next: 'Next page',
    announcement: 'Page {page} of {pageCount}',
  },
  it: {
    label: 'Paginazione',
    page: 'Pagina {page}',
    previous: 'Pagina precedente',
    next: 'Pagina successiva',
    announcement: 'Pagina {page} di {pageCount}',
  },
  ar: {
    label: 'ترقيم الصفحات',
    page: 'الصفحة {page}',
    previous: 'الصفحة السابقة',
    next: 'الصفحة التالية',
    announcement: 'الصفحة {page} من {pageCount}',
  },
});
