/**
 * The DS's own internal labels, bundled per locale. Consumers never pass these
 * strings; components resolve them from the active locale. The app may override
 * a subset once, via the `messages` field of the i18n port.
 */
export const UI_SUPPORTED_LOCALES = ['en', 'it'] as const;
export type UiLocale = (typeof UI_SUPPORTED_LOCALES)[number];
export const UI_FALLBACK_LOCALE: UiLocale = 'en';

export type UiMessageKey = 'dialog.close';

export const UI_CATALOGS: Record<UiLocale, Record<UiMessageKey, string>> = {
  en: { 'dialog.close': 'Close' },
  it: { 'dialog.close': 'Chiudi' },
};
