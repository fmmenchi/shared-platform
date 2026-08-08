import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface CardActionsProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /** The card's actions — usually a `Button` or two. */
  children: ReactNode;
}
