import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface AppLayoutNavProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /**
   * What the navigation is called — used to name the drawer on a small screen,
   * where the region becomes a `<dialog>` and a dialog with no accessible name
   * is announced as just "dialog".
   */
  label: string;
  /** The navigation itself, usually a `Nav orientation="vertical"`. */
  children: ReactNode;
}
