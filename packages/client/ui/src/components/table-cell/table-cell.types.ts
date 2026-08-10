import type { ComponentPropsWithRef } from 'react';
import type { TableAlign } from '../table/table.types.js';

/**
 * `align` shadows the deprecated HTML attribute of the same name, which is a
 * loose `string`. Ours is the design-system axis and reaches the cell as a data
 * attribute, so the presentational one is omitted rather than widened.
 */
export interface TableCellProps extends Omit<
  ComponentPropsWithRef<'td'>,
  'align'
> {
  /** Which edge the content sits against. Numbers want `end`. */
  align?: TableAlign;
}
