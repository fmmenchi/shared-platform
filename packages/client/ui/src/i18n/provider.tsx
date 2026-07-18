import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Direction, UiAdapters } from '@fmmenchi/ui-ports';
import {
  UI_FALLBACK_LOCALE,
  isSupportedLocale,
  type MessageCatalog,
  type UiLocale,
} from './messages.js';

interface UiContextValue {
  adapters: UiAdapters;
  direction: Direction;
}

const UiContext = createContext<UiContextValue | null>(null);

/** Right-to-left writing systems, by ISO-15924 script code. */
const RTL_SCRIPTS = new Set([
  'Arab', // Arabic
  'Hebr', // Hebrew
  'Syrc', // Syriac
  'Thaa', // Thaana (Dhivehi)
  'Nkoo', // N'Ko
  'Samr', // Samaritan
  'Mand', // Mandaic
  'Adlm', // Adlam (Fula)
  'Rohg', // Hanifi Rohingya
  'Yezi', // Yezidi
]);

/**
 * Derive text direction from the locale's *script*, never taken as injected
 * data. Baseline-safe: it resolves the script via `Intl.Locale.maximize()`
 * (Baseline: Widely available) rather than `Intl.Locale.prototype.getTextInfo`
 * (not Baseline — Firefox shipped it late). Script-based, so `az-Arab` → rtl
 * while `az` → ltr, which a language-only check gets wrong.
 */
function resolveDirection(locale: string, override?: Direction): Direction {
  if (override) return override;
  try {
    const script = new Intl.Locale(locale).maximize().script;
    if (script && RTL_SCRIPTS.has(script)) return 'rtl';
  } catch {
    /* malformed locale → fall through to ltr */
  }
  return 'ltr';
}

/** Pick the DS copy locale (base subtag), falling back to the base locale. */
function resolveLocale(locale: string): UiLocale {
  const base = locale.split('-')[0];
  return isSupportedLocale(base) ? base : UI_FALLBACK_LOCALE;
}

export interface UiProviderProps {
  adapters: UiAdapters;
  /** Reference preset name, applied as `data-theme` on the root. */
  theme?: string;
  children: ReactNode;
}

/**
 * The single, thin injection seam: carries the app's adapters + active theme
 * into context. It holds no catalogs of app copy and no locale *state* — it
 * only reads the injected locale and derives `dir`.
 */
export function UiProvider({ adapters, theme, children }: UiProviderProps) {
  const { i18n } = adapters;
  const value = useMemo<UiContextValue>(() => {
    const direction = resolveDirection(i18n.locale, i18n.directionOverride);
    return { adapters, direction };
  }, [adapters, i18n]);

  return (
    <UiContext.Provider value={value}>
      <div dir={value.direction} data-theme={theme}>
        {children}
      </div>
    </UiContext.Provider>
  );
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within <UiProvider>');
  return ctx;
}

/**
 * Resolve a component's colocated messages against the active locale. Returns a
 * `t` typed to the catalog's own keys. Safe outside a provider (falls back to
 * the base locale), and honors the app's set-once `messages` override, keyed by
 * `"<namespace>.<key>"`.
 */
export function useMessages<K extends string>(
  catalog: MessageCatalog<K>,
): (key: K) => string {
  const ctx = useContext(UiContext);
  const locale = resolveLocale(ctx?.adapters.i18n.locale ?? UI_FALLBACK_LOCALE);
  const overrides = ctx?.adapters.i18n.messages;
  return (key) =>
    overrides?.[`${catalog.namespace}.${key}`] ?? catalog.entries[locale][key];
}
