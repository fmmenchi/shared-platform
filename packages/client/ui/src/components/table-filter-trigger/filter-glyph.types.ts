import type { ComponentPropsWithRef } from 'react';

export interface FilterGlyphProps extends ComponentPropsWithRef<'svg'> {
  /** Whether this column is filtered right now. */
  active?: boolean;
}
