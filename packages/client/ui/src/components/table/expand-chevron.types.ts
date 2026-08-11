import type { ComponentPropsWithRef } from 'react';

export interface ExpandChevronProps extends Omit<
  ComponentPropsWithRef<'svg'>,
  'children'
> {
  /** Whether the row's detail is showing. Decides which way it points. */
  open?: boolean;
}
