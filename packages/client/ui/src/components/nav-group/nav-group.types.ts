import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface NavGroupProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> {
  /** What the group is called — the word on the button that opens it. */
  label: ReactNode;
  /** The links inside it. */
  children: ReactNode;
}
