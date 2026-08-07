import type { ComponentPropsWithRef, ElementType } from 'react';

export interface NavLinkProps extends ComponentPropsWithRef<'a'> {
  /**
   * What to render instead of `<a>` — a router's own link component.
   *
   * The design system ships no router (ADR-0001: framework-agnostic), so this
   * is the seam: `as={Link}` for React Router, `as={NextLink}` for Next. What
   * it renders must end in an anchor, or the browser has nothing to navigate.
   */
  as?: ElementType;
  /**
   * Marks the link to the page the reader is already on. Rendered as
   * `aria-current="page"`, which is what a screen reader announces — a colour
   * alone says it only to those who can see it (WCAG 1.4.1).
   */
  current?: boolean;
}
