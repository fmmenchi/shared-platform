import type { ElementType } from 'react';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';

interface PopoverCloseOwn {
  /** Anything that ends in a `<button>`; the DS `Button` by default. */
  as?: ElementType;
}

export type PopoverCloseProps<As extends ElementType = 'button'> =
  PolymorphicProps<As, PopoverCloseOwn>;
