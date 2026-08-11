import type { ComponentPropsWithRef, ElementType } from 'react';
import type { NavLinkExtraProps } from '../nav-link/nav-link.types.js';

/**
 * Public BreadcrumbLink props.
 *
 * Extends `NavLinkExtraProps` — the SAME augmentation hole `NavLink` reads,
 * on purpose: the hole declares what the app's router link accepts, the app
 * has exactly one router, and a second interface would make it declare that
 * router twice and let the two declarations drift. See `NavLinkExtraProps`
 * for the declaration-merging recipe and its limits.
 */
export interface BreadcrumbLinkProps
  extends ComponentPropsWithRef<'a'>, NavLinkExtraProps {
  /**
   * What to render instead of the app's link — for THIS crumb only. The
   * router normally arrives once, through the `Link` adapter on `UiProvider`;
   * an href that already says it leaves the app (a scheme, `//`) renders a
   * plain anchor unasked. What is left for this prop is the case the href
   * cannot express — see {@link NavLinkProps.as}, the same seam.
   */
  as?: ElementType;
  /**
   * Render the child you pass as the crumb's link, instead of an element of
   * ours — the per-call, type-checked alternative to the augmentation. The
   * child must forward what it does not consume, or the class and
   * `aria-current` are silently lost — see {@link NavLinkProps.asChild}.
   */
  asChild?: boolean;
  /**
   * Marks the crumb the reader is on — the LAST one, in the common case.
   * Rendered as `aria-current`, which is what a screen reader announces; the
   * stylesheet adds weight, never colour alone (WCAG 1.4.1).
   *
   * `true` means `'page'`. `'step'` is there for a trail that is a flow
   * rather than a hierarchy. Optional: with a `useIsCurrent` adapter on
   * `UiProvider` the design system asks the app instead — keeping only a
   * `page` answer, since every ancestor crumb is by definition the reader's
   * current location and saying so N times is noise. Explicit always wins.
   */
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
}
