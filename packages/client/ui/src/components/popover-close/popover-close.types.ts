import type { ElementType } from 'react';
import type { ButtonProps } from '../button/button.types.js';

/**
 * Same shape as `PopoverTriggerProps`, and for the same reason: it ends in a
 * `<button>`, because `popovertargetaction` works on nothing else.
 */
export type PopoverCloseProps = Omit<ButtonProps<'button'>, 'as'> & {
  /**
   * Render as this instead — anything that accepts a Button's props. Button's
   * own `as` is omitted above rather than merged: two `as` props intersect to
   * something nothing satisfies, and this one has the narrower job.
   */
  as?: ElementType<ButtonProps<'button'>>;
};
