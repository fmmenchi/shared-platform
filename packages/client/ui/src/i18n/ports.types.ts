import type {
  UseFormErrors,
  UseFormField,
  UseFormOptionField,
} from '../form/form-adapter.types.js';
/**
 * Injection ports — the contracts the app implements so the UI stays
 * provider-agnostic. Interfaces only (zero runtime): re-exported from the
 * package barrel, and because an app imports them with `import type`, wiring an
 * adapter never pulls in the component runtime.
 */
import type { ComponentType, ReactNode } from 'react';

/** Text direction — derived from the locale, never injected on its own. */
export type Direction = 'ltr' | 'rtl';

/**
 * i18n port. The only mandatory field is `locale`; `direction` is derived from
 * it (`Intl.Locale`). `messages` is an optional, set-once override of the DS's
 * own internal labels — the app never passes per-instance strings.
 */
export interface I18n {
  locale: string;
  messages?: Partial<Record<string, string>>;
  /** Escape hatch only; normally the provider derives `dir` from `locale`. */
  directionOverride?: Direction;
}

/** App-provided link component (bridges the app router). */
export type LinkComponent = ComponentType<
  { href: string; children?: ReactNode } & Record<string, unknown>
>;

/**
 * App-provided answer to "is this destination where the reader already is?".
 *
 * A HOOK, for the same reason the form binding's members are hooks: it is called
 * inside each link, so each subscribes for itself and re-renders when the route
 * changes. The design system never learns how the answer is computed — matching
 * a path is the router's job, and every router does it differently (a basename,
 * a locale prefix, typed params, search). It only asks.
 *
 * Return `'page'` for the page the reader is on and `'location'` for a SECTION
 * that contains it — the parent entry of a sidebar, which is not the same
 * claim. `true` means `'page'`. Return nothing for "not here".
 *
 * Leave it out when the injected `Link` already marks itself: React Router's
 * `NavLink` sets `aria-current="page"` on its own, and TanStack's `Link`
 * resolves activity from typed params the design system cannot see. Whoever
 * renders the anchor wins, so a second opinion would only be able to disagree.
 */
export type UseIsCurrent = (
  href: string,
) => boolean | 'page' | 'step' | 'location' | 'date' | 'time' | undefined;

/** App-provided imperative navigation. */
export type NavigateFn = (href: string) => void;

/**
 * App-provided icon renderer: name in, node out. The icon SET is app content
 * (brand identity, like colour presets) — the DS owns only this seam and its
 * own functional glyphs (drawn inline, e.g. the Button spinner).
 *
 * The contract an injected icon must satisfy, so it composes with the tokens:
 * - **`currentColor`** for fill/stroke — it inherits the semantic colour role
 *   of wherever it lands (e.g. `primary-foreground` inside a Button);
 * - **square `viewBox`**, no intrinsic `width`/`height` attributes;
 * - **sized in `em`** (or unsized, letting the slot size it) — it scales with
 *   the component's own type scale;
 * - decorative by default (components mark the slot `aria-hidden`); a
 *   meaningful icon carries its own accessible name (e.g. an svg `<title>`).
 */
export type IconRenderer = ComponentType<{ name: string }>;

/** The bundle the app injects through the single `UiProvider`. */
/** What a form library provides to the design system, given once at setup. */
export interface FormBinding {
  field: UseFormField;
  errors?: UseFormErrors;
  /**
   * How one field bound to MANY controls is drawn — a radio group, checkboxes
   * sharing a name, a multi-select's carriers.
   *
   * Optional for the same reason `errors` is: an app whose forms hold no group
   * is not made to implement one, and a component that needs it says so by name
   * when it is missing rather than binding nothing and submitting nothing.
   */
  optionField?: UseFormOptionField;
}

export interface UiAdapters {
  i18n: I18n;
  /**
   * The form library's binding, given ONCE when the design system is set up —
   * after which every `Form`, `FormInput`, `FormChoice` and
   * `FormErrorSummary` below works with nothing further to wire.
   *
   * Both members are hooks, called inside the components that render each
   * field, so each subscribes for itself. A single `Form` may still override
   * them, for the rare page that binds two libraries at once.
   */
  form?: FormBinding;
  Link?: LinkComponent;
  navigate?: NavigateFn;
  useIsCurrent?: UseIsCurrent;
  Icon?: IconRenderer;
}
