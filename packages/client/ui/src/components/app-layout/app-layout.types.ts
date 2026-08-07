import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface AppLayoutProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /**
   * The regions. `<header>` and `<aside>` are plain elements — they are
   * landmarks with no behaviour, and a component around one would be an element
   * that has not earned its place. The two that DO carry behaviour have parts:
   * `AppLayoutNav` (which becomes a drawer on a small screen) and
   * `AppLayoutMain` (which owns the skip target and the scroll region).
   */
  children: ReactNode;
}
