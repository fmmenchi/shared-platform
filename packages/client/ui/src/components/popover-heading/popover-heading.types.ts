import type { ComponentPropsWithRef, ElementType } from 'react';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';

interface PopoverHeadingOwn {
  /**
   * The heading level, as an element: `h2` by default. A popover appears inside
   * a page that already has a heading order, and only the page knows what level
   * comes next here.
   */
  as?: ElementType;
}

export type PopoverHeadingProps<As extends ElementType = 'h2'> =
  PolymorphicProps<As, PopoverHeadingOwn>;

export type PopoverHeadingElementProps = ComponentPropsWithRef<'h2'>;
