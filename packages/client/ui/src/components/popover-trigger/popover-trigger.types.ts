import type { ComponentPropsWithRef, ElementType } from 'react';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';

interface PopoverTriggerOwn {
  /**
   * What opens the popover. It must be a `<button>` in the end — the platform's
   * `popovertarget` works on nothing else — so `as` is here for the DS's own
   * `Button` and its variants, not to turn this into a `<div>`.
   */
  as?: ElementType;
}

export type PopoverTriggerProps<As extends ElementType = 'button'> =
  PolymorphicProps<As, PopoverTriggerOwn>;

export type PopoverTriggerElementProps = ComponentPropsWithRef<'button'>;
