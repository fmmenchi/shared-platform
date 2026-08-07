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
   * Marks the link to the page the reader is already on. Rendered as
   * `aria-current="page"`, which is what a screen reader announces — a colour
   * alone says it only to those who can see it (WCAG 1.4.1).
   */
  current?: boolean;
}
