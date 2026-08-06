import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Direction, UiAdapters } from './ports.types.js';
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
  /**
   * What this provider declares. Everything omitted is INHERITED from a
   * provider above, so a nested one states only what it changes; the outermost
   * must declare `i18n`, which is checked at runtime because no type can see
   * what is above a component.
   */
  adapters: Partial<UiAdapters>;
  /** Reference preset name, applied as `data-theme` on the root. */
  theme?: string;
  children: ReactNode;
}

/**
 * The single, thin injection seam: carries the app's adapters + active theme
 * into context. It holds no catalogs of app copy and no locale *state* — it
 * only reads the injected locale and derives `dir`.
 *
 * **It composes.** A nested provider INHERITS every adapter it does not declare,
 * so scoping one of them costs one line and repeats nothing:
 *
 *     <UiProvider adapters={{ i18n, form: rhfBinding }}>   // the app, once
 *       …
 *       <UiProvider adapters={{ form: tanstackBinding }}>  // one screen
 *
 * The merge is per top-level adapter: what you declare replaces that key
 * whole — `form: { field }` drops an inherited `errors`, deliberately, because
 * a half-inherited binding is harder to reason about than a stated one.
 *
 * That composability is why there is no second, form-only provider: an earlier
 * version had one and it was removed, since nesting already covered the case
 * and two mechanisms were read by everyone. What nesting cost — repeating the
 * locale, and a second wrapper element — is fixed here instead.
 *
 * `i18n` is the one adapter that must exist somewhere: the outermost provider
 * declares it, and it throws rather than degrading, because a design system
 * that quietly picks a locale gets it wrong in a language nobody on the team
 * reads.
 */
export function UiProvider({ adapters, theme, children }: UiProviderProps) {
  const inherited = useContext(UiContext);

  const value = useMemo<UiContextValue>(() => {
    const merged = { ...inherited?.adapters, ...adapters };
    if (merged.i18n == null) {
      throw new Error(
        'UiProvider: no `i18n` in scope — the outermost provider must declare it.',
      );
    }
    return {
      adapters: merged as UiAdapters,
      direction: resolveDirection(
        merged.i18n.locale,
        merged.i18n.directionOverride,
      ),
    };
  }, [inherited, adapters]);

  // The wrapper carries `dir` and `data-theme`, so a nested provider that
  // changes neither would add an element that says exactly what its ancestor
  // already says — and an extra box in a grid or a flex row is not nothing.
  const carries =
    inherited == null ||
    theme !== undefined ||
    value.direction !== inherited.direction;

  return (
    <UiContext value={value}>
      {carries ? (
        <div dir={value.direction} data-theme={theme}>
          {children}
        </div>
      ) : (
        children
      )}
    </UiContext>
  );
}

/**
 * The injected adapters, or `undefined` outside a provider — the tolerant
 * counterpart of `useUi`, for the parts of the design system that must keep
 * working without one. Nothing here throws, because a component that merely
 * ASKS whether an adapter was supplied should not require the provider to exist.
 */
export function useUiAdapters(): UiAdapters | undefined {
  return useContext(UiContext)?.adapters;
}

/**
 * The text direction, or `'ltr'` outside a provider — the tolerant counterpart
 * of `useUi().direction`, for a component that must keep working without one.
 * A menu needs it to know which arrow means "into the submenu": that is the
 * INLINE direction, and the physical key depends on the reader's language.
 */
export function useDirection(): Direction {
  return useContext(UiContext)?.direction ?? 'ltr';
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
