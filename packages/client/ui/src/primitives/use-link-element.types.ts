import type { ElementType } from 'react';

/** The three ways a call site can say who renders — see `useLinkElement`. */
export interface UseLinkElementOptions {
  /** Per-call override: render this instead of the injected link. */
  as?: ElementType;
  /** Render the child the caller wrote, via `Slot`. Wins over `as`. */
  asChild?: boolean;
  /** The destination — read only to decide whether it leaves the app. */
  href?: string;
}

export interface UseLinkElementResult {
  /** What to render. Always an `ElementType`; `Slot` when `asChild`. */
  Component: ElementType;
  /**
   * Whether the href says it leaves the app. Surfaced because the caller
   * needs the same fact for a second decision — `useInjectedCurrent` must
   * not send another site's URL into the app's own matcher.
   */
  external: boolean;
}
