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

/**
 * Fill `{name}` placeholders in a resolved message.
 *
 * A message with a moving part is ONE string with a hole in it, never a
 * fragment the component finishes by hand: `t('back') + ' ' + name` reads
 * "Back to Share" and cannot read anything else, because the word order is in
 * the code rather than in the copy. Japanese puts the name first and the verb
 * last, Turkish and Finnish inflect the name — and none of that is reachable by
 * a translator, nor by an app overriding `menuContent.back`, while the two
 * halves are glued together outside the catalogue.
 *
 * A placeholder with no value is LEFT ALONE rather than blanked: an app may
 * override a message with one that has different holes, and a visible `{name}`
 * is a bug that gets reported, where an empty string is a label that quietly
 * says less than it should.
 */
export function interpolate(
  message: string,
  values?: Readonly<Record<string, string | number>>,
): string {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}
