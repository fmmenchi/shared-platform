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

/** App-provided imperative navigation. */
export type NavigateFn = (href: string) => void;

/** App-provided icon renderer: name in, node out. */
export type IconRenderer = ComponentType<{ name: string }>;

/** Where portalled content (dialogs, popovers) mounts. */
export type PortalContainer = HTMLElement | (() => HTMLElement);

/** The bundle the app injects through the single `UiProvider`. */
export interface UiAdapters {
  i18n: I18n;
  Link?: LinkComponent;
  navigate?: NavigateFn;
  Icon?: IconRenderer;
  portalContainer?: PortalContainer;
}
