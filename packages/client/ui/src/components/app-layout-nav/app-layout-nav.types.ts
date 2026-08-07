import type { ReactNode } from 'react';

export interface AppLayoutNavProps {
  /**
   * What the navigation is called — the name of the drawer on a small screen,
   * where the region becomes a `<dialog>` and one with no accessible name is
   * announced as just "dialog".
   */
  label: string;
  /**
   * An `AppLayoutNavColumn`, an `AppLayoutNavDrawer`, or both — what the
   * navigation is in each form, of which only the one in play is mounted. Give
   * one and it serves both; give neither, and these children are the
   * navigation in both forms.
   */
  children: ReactNode;
  /** Applied to the region, in both of its forms. */
  className?: string;
}
