import type { ComponentPropsWithRef } from 'react';
import type { SortDirection } from '../../sorting/compare.types.js';

export interface SortArrowProps extends ComponentPropsWithRef<'svg'> {
  /** Which way the column in force points, or nothing when it is not in force. */
  direction?: SortDirection;
}
