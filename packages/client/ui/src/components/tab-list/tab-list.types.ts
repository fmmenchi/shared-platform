import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface TabListProps extends ComponentPropsWithRef<'div'> {
  /**
   * What the list of tabs is called. A `tablist` with no accessible name is
   * announced as just "tab list", which on a page with two of them tells a
   * reader nothing about which one they are in.
   */
  'aria-label'?: string;
  children: ReactNode;
}
