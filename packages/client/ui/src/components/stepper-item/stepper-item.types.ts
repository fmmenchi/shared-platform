import type { ComponentPropsWithRef, ReactNode } from 'react';

/** Where a step sits relative to the reader, or that it went wrong. */
export type StepperItemStatus = 'complete' | 'current' | 'upcoming' | 'error';

interface StepperItemOwnProps {
  /**
   * Where this step sits relative to the reader. Default `upcoming`.
   *
   * `error` is exclusive with the rest on purpose: a step that failed is more
   * urgent than where the reader happens to be, so it takes the slot. When the
   * failed step is ALSO the one they are on, pass `aria-current="step"`
   * yourself — props spread after the internal ones precisely so a consumer
   * can, the same escape hatch `BreadcrumbLink` documents.
   *
   * Reaches the stylesheet as `data-status`, the majority house pattern for an
   * enum axis (see `separator`, `tabs`, `toast`, `table`) — and, since a hashed
   * CSS Module leaves a consumer no other seam, the attribute is also the
   * supported way to restyle a state.
   */
  status?: StepperItemStatus;
  /**
   * The step's label. Pass an `<a>` for a step the reader may go back to, and
   * plain text for one they may not — that difference is the consumer's to
   * make, because only they know which steps are reachable.
   */
  children?: ReactNode;
}

/**
 * Public StepperItem props.
 *
 * No `as`: an `<ol>` may only contain `<li>`, so there is no other element
 * this could become. What varies is what goes INSIDE it, which is `children`.
 */
export type StepperItemProps = StepperItemOwnProps &
  Omit<ComponentPropsWithRef<'li'>, keyof StepperItemOwnProps>;
