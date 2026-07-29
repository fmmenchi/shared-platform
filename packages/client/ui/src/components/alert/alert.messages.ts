import { defineMessages } from '../../i18n/messages.js';

/**
 * Alert's own micro-copy: the severity word, rendered visually-hidden before the
 * message so the status is conveyed to assistive tech — not by colour alone
 * (WCAG 1.4.1). One key per variant; apps can override the catalog.
 */
export const alertMessages = defineMessages('alert', {
  en: {
    info: 'Information',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
  },
  it: {
    info: 'Informazione',
    success: 'Successo',
    warning: 'Attenzione',
    error: 'Errore',
  },
  ar: {
    info: 'معلومة',
    success: 'نجاح',
    warning: 'تحذير',
    error: 'خطأ',
  },
});
