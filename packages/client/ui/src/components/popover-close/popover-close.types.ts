import type { ElementType } from 'react';
import type { ButtonProps } from '../button/button.types.js';

/**
 * The same props as `PopoverTrigger`: a `Button`'s, plus an `as` for anything
 * that accepts them and ends in a `<button>`.
 */
export type PopoverCloseProps = Omit<ButtonProps<'button'>, 'as'> & {
  /**
   * Render as this instead — anything that accepts a Button's props. Button's
   * own `as` is omitted above rather than merged: two `as` props intersect to
   * something nothing satisfies, and this one has the narrower job.
   */
  as?: ElementType<ButtonProps<'button'>>;
};
