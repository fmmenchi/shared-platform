import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface TabPanelProps extends ComponentPropsWithRef<'div'> {
  /** Which tab this belongs to — the same string that tab was given. */
  value: string;
  children: ReactNode;
}
