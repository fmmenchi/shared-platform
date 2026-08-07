import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface MenuGroupProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /**
   * What the set is called — "Sort by", "Zoom". Shown, and used as the group's
   * accessible name, so a reader hears which set a choice belongs to.
   */
  label: ReactNode;
  /** The commands in the set. */
  children: ReactNode;
}
