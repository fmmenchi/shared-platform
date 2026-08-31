import type { ComponentPropsWithRef, ReactNode } from 'react';

/** Which way the sequence runs. */
export type StepperOrientation = 'horizontal' | 'vertical';

interface StepperOwnProps {
  /**
   * Which way the sequence runs. Default `horizontal`.
   *
   * Reaches the stylesheet as `data-orientation` rather than a cva class: it
   * is one axis with a 1:1 mapping, the same shape Separator ships, and the
   * attribute is what lets the list own the connector geometry without the
   * item's stylesheet having to know which way it points.
   */
  orientation?: StepperOrientation;
  /** `StepperItem` children, in the order the reader works through them. */
  children?: ReactNode;
}

/**
 * Public Stepper props.
 *
 * No `as`: this component is a `<nav>` wrapping an `<ol>`, and both halves
 * carry meaning a reader depends on — the landmark to find the thing, the
 * ordered list to be told "list, 4 items" and hear each position. There is no
 * other element it could legally become.
 */
export type StepperProps = StepperOwnProps &
  Omit<ComponentPropsWithRef<'nav'>, keyof StepperOwnProps>;
