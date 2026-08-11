import type { ComponentPropsWithRef } from 'react';
import type { TableAlign } from '../table/table.types.js';

/** `align` shadows the deprecated HTML attribute — see `TableCellProps`. */
export interface TableHeaderCellProps extends Omit<
  ComponentPropsWithRef<'th'>,
  'align'
> {
  /** Which edge the content sits against. Numbers want `end`. */
  align?: TableAlign;
}
