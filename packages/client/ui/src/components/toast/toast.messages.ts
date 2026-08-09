import { defineMessages } from '../../i18n/messages.js';

/**
 * The one string a toast owns. The message itself is the product's; the way out
 * of it is the design system's, so it is the design system that names it.
 */
export const toastMessages = defineMessages('toast', {
  en: { dismiss: 'Dismiss', region: 'Notifications' },
  it: { dismiss: 'Chiudi', region: 'Notifiche' },
  ar: { dismiss: 'إغلاق', region: 'الإشعارات' },
});
