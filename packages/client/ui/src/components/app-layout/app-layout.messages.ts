import { defineMessages } from '../../i18n/messages.js';

/**
 * The two strings a page shell owes and a consumer should not have to remember.
 *
 * The skip link is WCAG 2.4.1: the first thing a keyboard user meets, and the
 * only way past a navigation they have already read on every page. It is copy
 * the design system supplies because it is the design system that renders it.
 */
export const appLayoutMessages = defineMessages('appLayout', {
  en: { skip: 'Skip to content', openNav: 'Menu', close: 'Close' },
  it: { skip: 'Vai al contenuto', openNav: 'Menu', close: 'Chiudi' },
  ar: { skip: 'تخطَّ إلى المحتوى', openNav: 'القائمة', close: 'إغلاق' },
});
