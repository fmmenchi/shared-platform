import type { ComponentPropsWithRef, ElementType } from 'react';

export interface NavLinkProps extends ComponentPropsWithRef<'a'> {
  /**
   * What to render instead of the app's link — for THIS link only.
   *
   * The router normally arrives once, through the `Link` adapter on
   * `UiProvider`, and every `NavLink` uses it without being told. This is the
   * exception: a destination that must not go through the router — another
   * site, a download, a `mailto:` — where `as="a"` gives back the plain
   * anchor. What it renders must end in an anchor, or the browser has nothing
   * to navigate.
   */
  as?: ElementType;
  /**
   * Marks where the reader already is. Rendered as `aria-current`, which is
   * what a screen reader announces — a colour alone says it only to those who
   * can see it (WCAG 1.4.1).
   *
   * `true` means `'page'`, the common case. The other tokens are there because
   * a navigation asks for them: `'location'` for the SECTION you are inside —
   * the parent entry of a sidebar tree, which is not the page you are on —
   * and `'step'` in a flow. Passing `aria-current` directly works too.
   */
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
}
