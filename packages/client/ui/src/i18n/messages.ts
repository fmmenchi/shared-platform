/**
 * The DS's i18n machinery. Copy is NOT here — it lives next to each component in
 * a `<name>.messages.ts` (colocation). This file only defines the supported
 * locales and the tiny helper a component uses to declare its own catalog.
 *
 * Consumers never pass these strings; a component resolves them from the active
 * locale (see `useMessages`), and the app may override a subset once via the
 * `messages` field of the i18n port.
 */
export const UI_SUPPORTED_LOCALES = ['en', 'it', 'ar'] as const;
export type UiLocale = (typeof UI_SUPPORTED_LOCALES)[number];
export const UI_FALLBACK_LOCALE: UiLocale = 'en';

/** True when `base` is a locale the DS ships copy for. */
export function isSupportedLocale(base: string): base is UiLocale {
  return (UI_SUPPORTED_LOCALES as readonly string[]).includes(base);
}

/**
 * A component's colocated message catalog: a namespace plus copy for **every**
 * supported locale (the type enforces completeness). Override keys are the
 * namespaced `"<namespace>.<key>"`, so the app can target a single label.
 */
export interface MessageCatalog<K extends string> {
  readonly namespace: string;
  readonly entries: Record<UiLocale, Record<K, string>>;
}

/** Declare a component's messages, colocated in its folder. */
export function defineMessages<K extends string>(
  namespace: string,
  entries: Record<UiLocale, Record<K, string>>,
): MessageCatalog<K> {
  return { namespace, entries };
}
