import type { ReactNode } from 'react';

export interface AppLayoutNavProps {
  /**
   * What the navigation is called — the name of the drawer on a small screen,
   * where the region becomes a `<dialog>` and one with no accessible name is
   * announced as just "dialog".
   */
  label: string;
  /** The navigation itself, usually a `Nav orientation="vertical"`. */
  children: ReactNode;
  /** Applied to the region, in both of its forms. */
  className?: string;
}
