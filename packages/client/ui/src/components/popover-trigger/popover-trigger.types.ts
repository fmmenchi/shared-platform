import type { ElementType } from 'react';
import type { ButtonProps } from '../button/button.types.js';

/**
 * What opens the popover: a `Button`'s props, so `variant` and the rest work as
 * they always do — plus an `as` for your own component, as long as it ends in a
 * `<button>`. The platform's `popovertarget` works on nothing else.
 */
export type PopoverTriggerProps = Omit<ButtonProps<'button'>, 'as'> & {
  /**
   * Render as this instead — anything that accepts a Button's props. Button's
   * own `as` is omitted above rather than merged: two `as` props intersect to
   * something nothing satisfies, and this one has the narrower job.
   */
  as?: ElementType<ButtonProps<'button'>>;
};
