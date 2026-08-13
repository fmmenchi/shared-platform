import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FormatterDefaults } from '@fmmenchi/formatting';
import type { Direction, UiAdapters } from './ports.types.js';
import {
  interpolate,
  UI_FALLBACK_LOCALE,
  isSupportedLocale,
  type MessageCatalog,
  type UiLocale,
} from './messages.js';

interface UiContextValue {
  adapters: UiAdapters;
  direction: Direction;
  formatting: FormatterDefaults;
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

/**
 * The locale THE COPY IS IN — for formatting a value that goes inside a
 * sentence.
 *
 * There are two locale questions and they have different right answers.
 * Collation asks about the READER (`useTableSort` reads the raw injected tag,
 * because a German app whose copy fell back to English must still sort as
 * German). A number embedded in a sentence asks about the SENTENCE: with
 * `de-DE` injected and no German catalog, the copy resolves to English while
 * `Intl.NumberFormat('de-DE')` writes "2.450" — and an English reader parses
 * that as two-point-four-five. Same class of defect the formatting exists to
 * prevent, one layer up.
 */
export function useCopyLocale(): UiLocale {
  const ctx = useContext(UiContext);
  return resolveLocale(ctx?.adapters.i18n.locale ?? UI_FALLBACK_LOCALE);
}

export interface UiProviderProps {
  /**
   * What this provider declares. Everything omitted is INHERITED from a
   * provider above, so a nested one states only what it changes; the outermost
   * must declare `i18n`, which is checked at runtime because no type can see
   * what is above a component.
   */
  adapters: Partial<UiAdapters>;
  /**
   * The two things about formatting an APP decides and a component cannot: the
   * zone a date is read in, and the currency an amount falls back to.
   *
   * NOT AN ADAPTER, and the distinction is the point. `adapters` is where a
   * choice of IMPLEMENTATION goes — React Hook Form or TanStack Form, one
   * router or another — and of `Intl` there is exactly one, so a port there
   * would be a seam with a single plug. This is configuration: nothing is being
   * swapped, two questions are being answered.
   *
   * It INHERITS like the adapters do, per key: a nested provider that states a
   * zone keeps the currency from above. Which is the difference from the
   * adapter merge one field up, where a declared key replaces its object whole
   * — there, a half-inherited binding is harder to reason about than a stated
   * one; here, the two fields are unrelated answers and there is nothing to
   * half-inherit.
   */
  formatting?: FormatterDefaults;
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
export function UiProvider({
  adapters,
  formatting,
  theme,
  children,
}: UiProviderProps) {
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
      formatting: { ...inherited?.formatting, ...formatting },
    };
  }, [inherited, adapters, formatting]);

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

/**
 * The app's formatting answers, or none — the tolerant counterpart of
 * `useUi().formatting`, and tolerant for the reason `useDirection` is: a
 * component that merely asks whether an app stated a zone must not require the
 * provider to exist. `Table` renders without one today, and a hook that threw
 * here would have made a formatted column the one thing that needs a provider
 * when nothing else in the table does.
 *
 * The empty object is a CONSTANT, so it is the same object every time and a
 * `useMemo` keyed on it does not rebuild on every render.
 */
export function useFormattingDefaults(): FormatterDefaults {
  return useContext(UiContext)?.formatting ?? NO_FORMATTING_DEFAULTS;
}

const NO_FORMATTING_DEFAULTS: FormatterDefaults = Object.freeze({});

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
): (key: K, values?: Readonly<Record<string, string | number>>) => string {
  const ctx = useContext(UiContext);
  const locale = resolveLocale(ctx?.adapters.i18n.locale ?? UI_FALLBACK_LOCALE);
  const overrides = ctx?.adapters.i18n.messages;
  return (key, values) => {
    const message =
      overrides?.[`${catalog.namespace}.${key}`] ??
      catalog.entries[locale][key];
    const filled = interpolate(message, values);

    // A hole nobody filled reaches the user as `{name}`, and in an `aria-label`
    // nobody reads it before a screen reader does. Said out loud in dev — the
    // condition is about the RESULT, so it catches an app's override that
    // introduced a placeholder the component knows nothing about.
    if (process.env.NODE_ENV !== 'production' && /\{\w+\}/.test(filled)) {
      console.warn(
        `useMessages (${catalog.namespace}.${key}): "${filled}" still has an ` +
          'unfilled placeholder. Pass it in the second argument.',
      );
    }
    return filled;
  };
}
