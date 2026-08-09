import type { ComponentPropsWithRef, ElementType } from 'react';

export interface NavLinkProps extends ComponentPropsWithRef<'a'> {
  /**
   * What to render instead of the app's link — for THIS link only.
   *
   * The router normally arrives once, through the `Link` adapter on
   * `UiProvider`, and every `NavLink` uses it without being told. This is the
   * exception, and a NARROW one now: an href that already says it leaves the
   * app — a scheme like `https:` or `mailto:`, or a protocol-relative `//` —
   * renders a plain anchor on its own, without being told. What is left for
   * this prop is the case the href cannot express: forcing the ROUTER back on
   * for an absolute URL to your own origin, or rendering something else
   * entirely. What it renders must end in an anchor, or the browser has
   * nothing to navigate.
   */
  as?: ElementType;
  /**
   * Marks where the reader already is. Rendered as `aria-current`, which is
   * what a screen reader announces — a colour alone says it only to those who
   * can see it (WCAG 1.4.1).
   *
   * Optional now: with a `useIsCurrent` on `UiProvider` the design system asks
   * the app instead, and this prop becomes the override for what the matching
   * cannot know. Explicit always wins.
   *
   * `true` means `'page'`, the common case. The other tokens are there because
   * a navigation asks for them: `'location'` for the SECTION you are inside —
   * the parent entry of a sidebar tree, which is not the page you are on —
   * and `'step'` in a flow. Passing `aria-current` directly works too.
   */
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
}
